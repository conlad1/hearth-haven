import { useNavigate } from 'react-router-dom';
import { Heart, Home, BookOpen, Sparkles, ArrowLeft } from 'lucide-react';

export default function ThankYouPage() {
  const navigate = useNavigate();

  const impacts = [
    { icon: Home, text: 'Supports safe housing for children in need' },
    { icon: BookOpen, text: 'Provides education and wellbeing resources' },
    { icon: Sparkles, text: 'Helps transform and restore lives' },
  ];

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
            <Heart className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thank You for Your Donation!</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Your generosity helps provide safety, care, and opportunity to those who need it most.
          </p>

          <div className="mt-6 rounded-xl bg-gray-50 dark:bg-gray-800 px-5 py-4 text-left">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Your Impact</h3>
            <ul className="mt-3 space-y-3">
              {impacts.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <Icon className="h-4 w-4 shrink-0 text-orange-500" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="btn-primary flex-1" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
            <button className="btn-secondary flex-1" onClick={() => navigate('/donate')}>
              Donate Again
            </button>
          </div>

          <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
            The Hearth Project is a registered nonprofit. Your contribution makes a difference.
          </p>
        </div>
      </div>
    </div>
  );
}
