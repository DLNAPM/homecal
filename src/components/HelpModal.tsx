import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-3xl font-bold text-slate-900 mb-6">About HomeCal</h2>
        
        <div className="space-y-6 text-slate-700">
          <section>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Description</h3>
            <p>
              HomeCal is an AI-powered calendar and scheduling assistant designed to help you manage your appointments, dictate your agenda, and seamlessly organize your life using natural language and voice commands.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">How to Use</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li><strong>Connect:</strong> Link your existing calendars (Google, Apple, Microsoft) via the Integrations menu.</li>
              <li><strong>Interact:</strong> Use the voice assistant (microphone icon) to add events or ask about your schedule.</li>
              <li><strong>Manage:</strong> View your schedule in Month, Week, or Day views. Click on dates with blue dots to see details.</li>
              <li><strong>Automate:</strong> Upload documents or use Smart Add to automatically extract and schedule events.</li>
            </ol>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Intended Audience</h3>
            <p>
              This app is designed for professionals, individuals with busy schedules, and anyone looking for hands-free, AI-assisted calendar management to improve their productivity and organization.
            </p>
          </section>

          <section className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <h3 className="text-xl font-semibold text-amber-900 mb-2">Disclaimer</h3>
            <p className="text-amber-800 text-sm">
              This application is intended for personal and professional scheduling assistance only. 
              It is <strong>NOT</strong> intended for storing highly sensitive medical records (HIPAA), confidential financial data, 
              or serving as a sole system of record for critical life-safety events. AI features may occasionally misinterpret 
              voice or text inputs; always verify important appointments independently.
            </p>
          </section>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
