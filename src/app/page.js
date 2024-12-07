'use client'

import React, { useState,useEffect } from 'react';
import exifr from 'exifr';

export default function Home() {
  const [metadata, setMetadata] = useState(null);
  const [displayFormat, setDisplayFormat] = useState('html');  // 'json' or 'html'

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];

    try {
      const exifData = await exifr.parse(file);
      if (exifData && Object.keys(exifData).length) {
        setMetadata(exifData);
      } else {
        setMetadata('No metadata found.');
      }
    } catch (error) {
      console.error('Error reading metadata:', error);
      setMetadata('Error reading metadata.');
    }
  };

  const renderMetadataHTML = (data) => {
    if (typeof data === 'string') return <p>{data}</p>;
    return (
      <div>
        {Object.entries(data).map(([key, value], index) => (
          <p key={index}><strong>{key}:</strong> {value.toString()}</p>
        ))}
      </div>
    );
  };

  return (
    <main className="flex flex-col min-h-screen items-center justify-center p-12 space-y-8">
      <div className="shadow-xl p-6 bg-black rounded-lg w-full max-w-xl flex flex-col items-center">
        <h1 className="text-3xl font-semibold mb-6 text-center">Image Metadata Extractor</h1>

        <p className="font-mono text-sm mb-4 text-center">
          Upload an image to extract it's metadata.
        </p>

        <input type="file" onChange={handleImageUpload} className="mb-4 p-2 border rounded" />

        {metadata && (
          <>
            <div className="my-4">
              <button
                onClick={() => setDisplayFormat(prevFormat => prevFormat === 'json' ? 'html' : 'json')}
                className="px-4 py-2 border rounded shadow-md hover:bg-blue-900 transition-all duration-200"
              >
                {displayFormat === 'json' ? 'Show as HTML' : 'Show as JSON'}
              </button>
            </div>
            <div className="p-4 rounded w-full overflow-auto shadow-inner">
              {displayFormat === 'json' ? <pre>{JSON.stringify(metadata, null, 2)}</pre> : renderMetadataHTML(metadata)}
            </div>
          </>
        )}
      </div>

      <section className="border-t border-gray-300 w-full max-w-xl pt-8 mt-8 text-center shadow-xl p-6 bg-black rounded-lg">
        <h2 className="text-xl font-bold mb-4">How to Use</h2>
        <ol className="list-decimal pl-5 space-y-2 text-left">
          <li>Click on the file input above to select an image from your device.</li>
          <li>Once selected, the app will automatically read the image&apos;s metadata.</li>
          <li>If the image contains metadata, it will be displayed below the input in either JSON or HTML format.</li>
          <li>If there&apos;s an issue reading the metadata or none is found, an appropriate message will be shown.</li>
        </ol>
      </section>

      <footer className="bottom-1 left-0 right-0 text-center text-sm">
        <p>{new Date().getFullYear()} | Lucian BLETAN</p>
        <a href="https://github.com/gni/ime" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GitHub Repository</a>
      </footer>
    </main>
  )
}
