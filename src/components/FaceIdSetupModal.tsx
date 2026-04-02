import React, { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { ScanFace, Upload, Camera, X, Loader2, ShieldCheck } from 'lucide-react';

export default function FaceIdSetupModal({ onClose }: { onClose: () => void }) {
  const { updateProfile, lockWithFaceId } = useAuth();
  const [step, setStep] = useState<'consent' | 'capture' | 'saving'>('consent');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConsent = (approved: boolean) => {
    if (approved) {
      setStep('capture');
    } else {
      onClose(); // Face Login stays disabled
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality to ensure it's well under 1MB
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImage(dataUrl);
        setError(null);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!image) return;
    setStep('saving');
    try {
      await updateProfile({
        faceIdEnabled: true,
        faceIdImage: image
      });
      lockWithFaceId();
      onClose();
    } catch (err) {
      setError('Failed to save Face ID settings.');
      setStep('capture');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ScanFace className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Set Up Face ID</h2>
        </div>

        {step === 'consent' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 space-y-3">
              <p>
                To use the Facial Recognition Service to log into the App, you need to provide a current image of yourself.
              </p>
              <p className="font-medium text-slate-900 flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Your image will be used <strong>ONLY for this APP for Login Purposes</strong> and nothing else.</span>
              </p>
              <p>
                Do you approve uploading your image for this purpose? If you reject, the Face Login feature will stay disabled.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleConsent(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleConsent(true)}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        )}

        {step === 'capture' && (
          <div className="space-y-6">
            <p className="text-slate-600 text-center text-sm">
              Upload a clear photo of your face, or take a new picture now.
            </p>
            
            {image ? (
              <div className="space-y-4">
                <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-indigo-100">
                  <img src={image} alt="Face ID Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setImage(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Retake
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <Camera className="w-8 h-8" />
                  <span className="font-medium">Take Picture or Upload</span>
                </button>
              </div>
            )}

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <button
              onClick={handleSave}
              disabled={!image}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Enable Face ID
            </button>
          </div>
        )}

        {step === 'saving' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-slate-600 font-medium">Saving Face ID settings...</p>
          </div>
        )}
      </div>
    </div>
  );
}
