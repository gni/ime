export async function extractMetadata(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const buffer = e.target.result;
        const view = new DataView(buffer);
        const metadata = {
          fileName: file.name,
          fileSize: formatBytes(file.size),
          fileType: file.type || 'Unknown',
          lastModified: new Date(file.lastModified).toLocaleString()
        };

        if (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.name.toLowerCase().endsWith('.jpg')) {
          const jpegData = parseJPEG(view);
          resolve({ ...metadata, ...jpegData });
        } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
          const pngData = parsePNG(view);
          resolve({ ...metadata, ...pngData });
        } else {
           resolve(metadata);
        }
      } catch (err) {
        resolve({ error: "Failed to parse metadata: " + err.message });
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const EXIF_TAGS = {
  0x010E: "ImageDescription",
  0x010F: "Make",
  0x0110: "Model",
  0x0112: "Orientation",
  0x011A: "XResolution",
  0x011B: "YResolution",
  0x0128: "ResolutionUnit",
  0x0131: "Software",
  0x0132: "DateTime",
  0x013B: "Artist",
  0x0213: "YCbCrPositioning",
  0x8298: "Copyright",
  0x8769: "ExifOffset",
  0x8825: "GPSInfoOffset",
  0x829A: "ExposureTime",
  0x829D: "FNumber",
  0x8822: "ExposureProgram",
  0x8827: "ISOSpeedRatings",
  0x9000: "ExifVersion",
  0x9003: "DateTimeOriginal",
  0x9004: "DateTimeDigitized",
  0x9101: "ComponentsConfiguration",
  0x9102: "CompressedBitsPerPixel",
  0x9201: "ShutterSpeedValue",
  0x9202: "ApertureValue",
  0x9203: "BrightnessValue",
  0x9204: "ExposureBiasValue",
  0x9205: "MaxApertureValue",
  0x9206: "SubjectDistance",
  0x9207: "MeteringMode",
  0x9208: "LightSource",
  0x9209: "Flash",
  0x920A: "FocalLength",
  0x9286: "UserComment",
  0x9C9B: "XPTitle",
  0x9C9C: "XPComment",
  0x9C9D: "XPAuthor",
  0x9C9E: "XPKeywords",
  0x9C9F: "XPSubject",
  0xA000: "FlashpixVersion",
  0xA001: "ColorSpace",
  0xA002: "PixelXDimension",
  0xA003: "PixelYDimension",
  0xA401: "CustomRendered",
  0xA402: "ExposureMode",
  0xA403: "WhiteBalance",
  0xA404: "DigitalZoomRatio",
  0xA405: "FocalLengthIn35mmFilm",
  0xA406: "SceneCaptureType",
  0xA408: "Contrast",
  0xA409: "Saturation",
  0xA40A: "Sharpness",
  0xA420: "ImageUniqueID",
  0x0000: "GPSVersionID",
  0x0001: "GPSLatitudeRef",
  0x0002: "GPSLatitude",
  0x0003: "GPSLongitudeRef",
  0x0004: "GPSLongitude",
  0x0005: "GPSAltitudeRef",
  0x0006: "GPSAltitude",
  0x0007: "GPSTimeStamp",
  0x001D: "GPSDateStamp"
};

function parseJPEG(view) {
  const length = view.byteLength;
  let offset = 2;
  const result = {};

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

function parseTIFF(view, tiffOffset) {
  const align = view.getUint16(tiffOffset, false);
  let littleEndian;
  if (align === 0x4949) littleEndian = true;
  else if (align === 0x4D4D) littleEndian = false;
  else return {};

  if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) return {};

  const firstIFDOffset = view.getUint32(tiffOffset + 4, littleEndian);
  const tags = readIFD(view, tiffOffset, tiffOffset + firstIFDOffset, littleEndian);
  
  const parsedTags = {};
  for (const [tagId, value] of Object.entries(tags)) {
    const tagName = EXIF_TAGS[tagId] || `Unknown_Tag_0x${parseInt(tagId).toString(16).toUpperCase()}`;
    parsedTags[tagName] = value;
  }

  if (parsedTags.ExifOffset) {
    const exifTags = readIFD(view, tiffOffset, tiffOffset + parsedTags.ExifOffset, littleEndian);
    for (const [tagId, value] of Object.entries(exifTags)) {
      const tagName = EXIF_TAGS[tagId] || `Unknown_Exif_0x${parseInt(tagId).toString(16).toUpperCase()}`;
      parsedTags[tagName] = value;
    }
    delete parsedTags.ExifOffset;
  }
  
  if (parsedTags.GPSInfoOffset) {
    const gpsTags = readIFD(view, tiffOffset, tiffOffset + parsedTags.GPSInfoOffset, littleEndian);
    for (const [tagId, value] of Object.entries(gpsTags)) {
      const tagName = EXIF_TAGS[tagId] || `Unknown_GPS_0x${parseInt(tagId).toString(16).toUpperCase()}`;
      parsedTags[tagName] = value;
    }
    delete parsedTags.GPSInfoOffset;
  }

  return parsedTags;
}

function readIFD(view, tiffOffset, dirOffset, littleEndian) {
  const entries = view.getUint16(dirOffset, littleEndian);
  const tags = {};
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
    
    // Safety check to avoid out of bounds
    if (valueOffset + dataSize <= view.byteLength) {
      const value = readTagValue(view, type, count, valueOffset, littleEndian);
      tags[tag] = value;
    }
  }
  return tags;
}

function getDataTypeSize(type) {
  switch (type) {
    case 1: case 2: case 6: case 7: return 1;
    case 3: case 8: return 2;
    case 4: case 9: return 4;
    case 5: case 10: return 8;
    default: return 0;
  }
}

function readTagValue(view, type, count, offset, littleEndian) {
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
         const header = String.fromCharCode(...bytes.subarray(0, 8)).replace(/\0/g, '');
         if (header === 'ASCII') {
             let str = '';
             for (let i=8; i<count; i++) if(bytes[i] !== 0) str += String.fromCharCode(bytes[i]);
             return str.trim();
         } else if (header === 'UNICODE') {
             let str = '';
             for (let i=8; i<count; i+=2) {
                 if (bytes[i]===0 && bytes[i+1]===0) break;
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
    case 2:
      let str2 = '';
      for (let i = 0; i < count - 1; i++) {
        const charCode = view.getUint8(offset + i);
        if (charCode !== 0) str2 += String.fromCharCode(charCode);
      }
      return str2.trim();
    case 3:
      if (count === 1) return view.getUint16(offset, littleEndian);
      const shorts = [];
      for (let i = 0; i < count; i++) shorts.push(view.getUint16(offset + i * 2, littleEndian));
      return shorts;
    case 4:
      if (count === 1) return view.getUint32(offset, littleEndian);
      const longs = [];
      for (let i = 0; i < count; i++) longs.push(view.getUint32(offset + i * 4, littleEndian));
      return longs;
    case 5:
      if (count === 1) {
        return [view.getUint32(offset, littleEndian), view.getUint32(offset + 4, littleEndian)];
      }
      const rationals = [];
      for (let i = 0; i < count; i++) {
        rationals.push([view.getUint32(offset + i * 8, littleEndian), view.getUint32(offset + i * 8 + 4, littleEndian)]);
      }
      return rationals;
    case 10:
      if (count === 1) {
        return [view.getInt32(offset, littleEndian), view.getInt32(offset + 4, littleEndian)];
      }
      const srationals = [];
      for (let i = 0; i < count; i++) {
        srationals.push([view.getInt32(offset + i * 8, littleEndian), view.getInt32(offset + i * 8 + 4, littleEndian)]);
      }
      return srationals;
    default:
      return `<Type ${type} data>`;
  }
}

function parsePNG(view) {
  const length = view.byteLength;
  let offset = 8;
  const result = {};

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
