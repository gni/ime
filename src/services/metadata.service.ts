import { EXIF_TAGS, GPS_TAGS } from '../constants/exif_tags';

export interface FileMetadata {
  fileName: string;
  fileSize: string;
  fileType: string;
  lastModified: string;
  error?: string;
  [key: string]: string | number | number[] | number[][] | undefined;
}

export async function extractMetadata(file: File): Promise<FileMetadata> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e: ProgressEvent<FileReader>) {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error("Buffer could not be read");
        }
        
        const view = new DataView(buffer);
        const metadata: FileMetadata = {
          fileName: file.name,
          fileSize: formatBytes(file.size),
          fileType: file.type || 'Unknown',
          lastModified: new Date(file.lastModified).toLocaleString()
        };

        const fileNameLower = file.name.toLowerCase();

        if (file.type === 'image/jpeg' || file.type === 'image/jpg' || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg')) {
          const jpegData = parseJPEG(view);
          resolve({ ...metadata, ...jpegData });
        } else if (file.type === 'image/png' || fileNameLower.endsWith('.png')) {
          const pngData = parsePNG(view);
          resolve({ ...metadata, ...pngData });
        } else {
          resolve(metadata);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        resolve({
          fileName: file.name,
          fileSize: formatBytes(file.size),
          fileType: file.type || 'Unknown',
          lastModified: new Date(file.lastModified).toLocaleString(),
          error: "Failed to parse metadata: " + errorMsg
        });
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function parseJPEG(view: DataView): Record<string, any> {
  const length = view.byteLength;
  let offset = 2;
  const result: Record<string, any> = {};

  if (view.getUint16(0, false) !== 0xFFD8) {
    return { error: 'Invalid JPEG file' };
  }

  while (offset < length) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xFFE1) {
      const size = view.getUint16(offset, false);
      const identifier = view.getUint32(offset + 2, false);
      if (identifier === 0x45786966) { 
        const tiffOffset = offset + 8;
        const exifData = parseTIFF(view, tiffOffset);
        Object.assign(result, exifData);
      }
      offset += size;
    } else if ((marker & 0xFF00) === 0xFF00) {
      if (marker === 0xFFDA) break;
      const size = view.getUint16(offset, false);
      offset += size;
    } else {
      break;
    }
  }
  return result;
}

function parseTIFF(view: DataView, tiffOffset: number): Record<string, any> {
  const align = view.getUint16(tiffOffset, false);
  let littleEndian: boolean;
  
  if (align === 0x4949) littleEndian = true;
  else if (align === 0x4D4D) littleEndian = false;
  else return {};

  if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) return {};

  const firstIFDOffset = view.getUint32(tiffOffset + 4, littleEndian);
  const tags = readIFD(view, tiffOffset, tiffOffset + firstIFDOffset, littleEndian);
  
  const parsedTags: Record<string, any> = {};
  
  for (const [tagIdStr, value] of Object.entries(tags)) {
    const tagId = parseInt(tagIdStr, 10);
    const tagName = EXIF_TAGS[tagId] || `Unknown_Tag_0x${tagId.toString(16).toUpperCase()}`;
    parsedTags[tagName] = value;
  }

  if (parsedTags.ExifOffset) {
    const exifTags = readIFD(view, tiffOffset, tiffOffset + Number(parsedTags.ExifOffset), littleEndian);
    for (const [tagIdStr, value] of Object.entries(exifTags)) {
      const tagId = parseInt(tagIdStr, 10);
      const tagName = EXIF_TAGS[tagId] || `Unknown_Exif_0x${tagId.toString(16).toUpperCase()}`;
      parsedTags[tagName] = value;
    }
    delete parsedTags.ExifOffset;
  }
  
  if (parsedTags.GPSInfoOffset) {
    const gpsTags = readIFD(view, tiffOffset, tiffOffset + Number(parsedTags.GPSInfoOffset), littleEndian);
    for (const [tagIdStr, value] of Object.entries(gpsTags)) {
      const tagId = parseInt(tagIdStr, 10);
      const tagName = GPS_TAGS[tagId] || `Unknown_GPS_0x${tagId.toString(16).toUpperCase()}`;
      parsedTags[tagName] = value;
    }
    delete parsedTags.GPSInfoOffset;
  }

  return parsedTags;
}

function readIFD(view: DataView, tiffOffset: number, dirOffset: number, littleEndian: boolean): Record<number, any> {
  const entries = view.getUint16(dirOffset, littleEndian);
  const tags: Record<number, any> = {};
  
  for (let i = 0; i < entries; i++) {
    const entryOffset = dirOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    
    let valueOffset = entryOffset + 8;
    const dataSize = getDataTypeSize(type) * count;
    
    if (dataSize > 4) {
      valueOffset = tiffOffset + view.getUint32(valueOffset, littleEndian);
    }
    
    if (valueOffset + dataSize <= view.byteLength) {
      const value = readTagValue(view, type, count, valueOffset, littleEndian);
      tags[tag] = value;
    }
  }
  return tags;
}

function getDataTypeSize(type: number): number {
  switch (type) {
    case 1: case 2: case 6: case 7: return 1;
    case 3: case 8: return 2;
    case 4: case 9: return 4;
    case 5: case 10: return 8;
    default: return 0;
  }
}

function readTagValue(view: DataView, type: number, count: number, offset: number, littleEndian: boolean): any {
  switch (type) {
    case 1:
    case 6:
    case 7: {
      if (count === 1) return type === 6 ? view.getInt8(offset) : view.getUint8(offset);
      const bytes = new Uint8Array(count);
      for (let i = 0; i < count; i++) bytes[i] = view.getUint8(offset + i);
      
      let isUTF16LE = true;
      for (let i = 1; i < count; i += 2) {
        if (bytes[i] !== 0) { isUTF16LE = false; break; }
      }
      
      if (isUTF16LE && count >= 2) {
        let str = '';
        for (let i = 0; i < count; i += 2) {
           if (bytes[i] === 0 && bytes[i+1] === 0) break;
           str += String.fromCharCode(bytes[i] | (bytes[i+1] << 8));
        }
        if (str.length > 0) return str;
      }
      
      if (type === 7 && count >= 8) {
         const headerArray = Array.from(bytes.subarray(0, 8));
         const header = String.fromCharCode(...headerArray).replace(/\0/g, '');
         if (header === 'ASCII') {
             let str = '';
             for (let i = 8; i < count; i++) if (bytes[i] !== 0) str += String.fromCharCode(bytes[i]);
             return str.trim();
         } else if (header === 'UNICODE') {
             let str = '';
             for (let i = 8; i < count; i += 2) {
                 if (bytes[i] === 0 && bytes[i+1] === 0) break;
                 str += String.fromCharCode(bytes[i] | (bytes[i+1] << 8));
             }
             return str.trim();
         }
      }

      let allAscii = true;
      let str = '';
      for (let i = 0; i < count; i++) {
        if (bytes[i] === 0) break;
        if (bytes[i] < 32 || bytes[i] > 126) allAscii = false;
        str += String.fromCharCode(bytes[i]);
      }
      if (allAscii && str.length > 0) return str;

      if (count > 64) return `<${count} bytes of binary data>`;
      return Array.from(bytes);
    }
    case 2: {
      let str2 = '';
      for (let i = 0; i < count - 1; i++) {
        const charCode = view.getUint8(offset + i);
        if (charCode !== 0) str2 += String.fromCharCode(charCode);
      }
      return str2.trim();
    }
    case 3: {
      if (count === 1) return view.getUint16(offset, littleEndian);
      const shorts: number[] = [];
      for (let i = 0; i < count; i++) shorts.push(view.getUint16(offset + i * 2, littleEndian));
      return shorts;
    }
    case 4: {
      if (count === 1) return view.getUint32(offset, littleEndian);
      const longs: number[] = [];
      for (let i = 0; i < count; i++) longs.push(view.getUint32(offset + i * 4, littleEndian));
      return longs;
    }
    case 5: {
      if (count === 1) {
        return [view.getUint32(offset, littleEndian), view.getUint32(offset + 4, littleEndian)];
      }
      const rationals: number[][] = [];
      for (let i = 0; i < count; i++) {
        rationals.push([view.getUint32(offset + i * 8, littleEndian), view.getUint32(offset + i * 8 + 4, littleEndian)]);
      }
      return rationals;
    }
    case 10: {
      if (count === 1) {
        return [view.getInt32(offset, littleEndian), view.getInt32(offset + 4, littleEndian)];
      }
      const srationals: number[][] = [];
      for (let i = 0; i < count; i++) {
        srationals.push([view.getInt32(offset + i * 8, littleEndian), view.getInt32(offset + i * 8 + 4, littleEndian)]);
      }
      return srationals;
    }
    default:
      return `<Type ${type} data>`;
  }
}

function parsePNG(view: DataView): Record<string, string> {
  const length = view.byteLength;
  let offset = 8;
  const result: Record<string, string> = {};

  while (offset < length) {
    const chunkLength = view.getUint32(offset, false);
    offset += 4;
    
    let chunkType = '';
    for (let i = 0; i < 4; i++) {
      chunkType += String.fromCharCode(view.getUint8(offset + i));
    }
    offset += 4;

    if (chunkType === 'tEXt') {
      let keyword = '';
      let i = 0;
      while (i < chunkLength && view.getUint8(offset + i) !== 0) {
        keyword += String.fromCharCode(view.getUint8(offset + i));
        i++;
      }
      let text = '';
      i++;
      while (i < chunkLength) {
        text += String.fromCharCode(view.getUint8(offset + i));
        i++;
      }
      result[keyword] = text;
    }

    offset += chunkLength;
    offset += 4;
  }
  return result;
}