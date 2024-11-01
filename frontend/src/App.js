import React, { useState } from 'react';
import axios from 'axios';

const Navbar = ({ setSelectedComponent }) => (
  <nav className="flex justify-between items-center bg-gray-800 text-white py-4 px-8">
    <h1 className="text-2xl font-bold">Listalot</h1>
    <div className="space-x-4">
      <button
        onClick={() => setSelectedComponent("CSVUploader")}
        className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition"
      >
        CSV Uploader
      </button>
      <button
        onClick={() => setSelectedComponent("ImageUploader")}
        className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition"
      >
        Image Uploader
      </button>
    </div>
  </nav>
);

function CSVUploader() {
  const [file, setFile] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const handleReset = () => {
    setFile(null);
    setDownloadUrl('');
  };
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please upload a file first");

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:3000/process-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to process file');
    }
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100 rounded-lg shadow-lg space-y-4">
      <h2 className="text-xl font-semibold text-gray-700">Upload CSV to Condense Titles</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} className="p-2 border rounded" />
      <div className='flex flex-row space-x-10'>
      <button onClick={handleUpload} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
        Upload and Process
      </button>
      <button onClick={handleReset} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
        Reset
      </button>
      </div>
      {downloadUrl && (
        <a href={downloadUrl} download="reduced_titles.csv" className="text-blue-600 underline">
          Download Processed CSV
        </a>
      )}
    </div>
  );
}

export const ImageUploader = () => {
    const [images, setImages] = useState([]);
    const [originalPreviews, setOriginalPreviews] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [useFrontCamera, setUseFrontCamera] = useState(true);
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const handleReset = () => {
        setImages([]);
        setOriginalPreviews([]);
        setResults([]);
        setLoading(false);
        setIsCameraOpen(false);
      };
    const handleImageChange = (e) => {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files]);
      setOriginalPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
    };
  
    const handleDeleteImage = (index) => {
      setImages(images.filter((_, i) => i !== index));
      setOriginalPreviews(originalPreviews.filter((_, i) => i !== index));
    };
  
    const handleUpload = async () => {
      if (!images.length) return;
      setLoading(true);
  
      const formData = new FormData();
      images.forEach(image => formData.append('images', image));
  
      try {
        const response = await axios.post('http://localhost:3000/process-images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setResults(response.data.results);
      } catch (error) {
        console.error('Error processing images:', error);
      } finally {
        setLoading(false);
      }
    };
  
    const openCamera = async () => {
      setIsCameraOpen(true);
      const constraints = { video: { facingMode: useFrontCamera ? 'user' : 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
    };
  
    const captureImage = () => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  
      canvas.toBlob((blob) => {
        const file = new File([blob], 'captured_image.jpg', { type: 'image/jpeg' });
        setImages(prev => [...prev, file]);
        setOriginalPreviews(prev => [...prev, URL.createObjectURL(blob)]);
      });
  
      closeCamera();
    };
  
    const closeCamera = () => {
      const stream = videoRef.current.srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());
      setIsCameraOpen(false);
    };
  
    const toggleCamera = () => {
      setUseFrontCamera(prev => !prev);
      closeCamera();
      openCamera();
    };
  
    const renderAnalysis = (analysisData) => (
      <ul className="text-left inline-block">
        <li><strong>Description:</strong> {analysisData.product.description}</li>
        <li><strong>Brand:</strong> {analysisData.product.brand}</li>
        <li><strong>Category:</strong> {analysisData.product.category}</li>
        <li><strong>Dimensions:</strong></li>
        <ul className="ml-4">
          <li><strong>Length:</strong> {analysisData.product.dimensions.length} inches</li>
          <li><strong>Height:</strong> {analysisData.product.dimensions.height} inches</li>
          <li><strong>Width:</strong> {analysisData.product.dimensions.width} inches</li>
        </ul>
        <li><strong>Prices:</strong></li>
        <ul className="ml-4">
          <li><strong>eBay:</strong> ${analysisData.product.prices.eBay}</li>
          <li><strong>Amazon:</strong> ${analysisData.product.prices.Amazon}</li>
        </ul>
      </ul>
    );
  
    return (
      <div className="flex flex-col items-center p-8 bg-gray-100 rounded-lg shadow-lg space-y-4">
        <h2 className="text-xl font-semibold text-gray-700">Upload or Capture Images for Analysis</h2>
        <h2 className="text-lg font-semibold text-gray-400">You can upload single or multiple images at time and and also upload later after selection to run a batch.</h2>
        <h2 className="text-lg font-semibold text-gray-400">You can also upload image from the camera</h2>

        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="p-2 border rounded" />
        <div className="flex space-x-4">
          <button onClick={handleUpload} disabled={loading || !images.length} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50">
            {loading ? 'Processing...' : 'Upload and Analyze All'}
          </button>
          <button onClick={openCamera} disabled={isCameraOpen} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50">
            Open Camera
          </button>
          <button onClick={handleReset} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
        Reset
      </button>
        </div>
  
        {isCameraOpen && (
          <div className="flex flex-col items-center mt-4 space-y-4">
            <video ref={videoRef} autoPlay className="w-72 h-56 rounded-md shadow-md" />
            <div className="flex space-x-4">
              <button onClick={captureImage} className="px-4 py-2 bg-yellow-500 text-white rounded">Capture</button>
              <button onClick={toggleCamera} className="px-4 py-2 bg-gray-600 text-white rounded">Flip Camera</button>
              <button onClick={closeCamera} className="px-4 py-2 bg-red-600 text-white rounded">Close Camera</button>
            </div>
            <canvas ref={canvasRef} className="hidden" width="300" height="225" />
          </div>
        )}
  
        <div className="flex flex-wrap mt-6 gap-4">
          {originalPreviews.map((preview, index) => (
            <div key={index} className="relative flex flex-col items-center">
              <img src={preview} alt={`Original ${index}`} className="w-40 h-auto rounded-md shadow-md" />
              <button onClick={() => handleDeleteImage(index)} className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1">✕</button>
            </div>
          ))}
        </div>
  
        {results.length > 0 && (
          <div className="flex flex-col items-center mt-6 space-y-6">
            <h2 className="text-lg font-medium">Image Analysis Results</h2>
            {results.map((result, index) => (
              <div key={index} className="space-y-4">
                <img src={result.dataURL} alt={`Processed ${index}`} className="w-40 h-auto rounded-md shadow-md" />
                <h3 className="text-lg font-medium">Analysis {index + 1}</h3>
                {renderAnalysis(result.analysis)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


const App = () => {
  const [selectedComponent, setSelectedComponent] = useState("CSVUploader");

  return (
    <div className="min-h-screen bg-gray-200 text-gray-800">
      <Navbar setSelectedComponent={setSelectedComponent} />
      <div className="flex justify-center p-8">
        {selectedComponent === "CSVUploader" ? <CSVUploader /> : <ImageUploader />}
      </div>
    </div>
  );
};

export default App;