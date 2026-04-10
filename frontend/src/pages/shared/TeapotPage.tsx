import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';
import { Coffee, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeapotPage() {
  const [status, setStatus] = useState<number | null>(null);
  const [message, setMessage] = useState('Brewing response from the The Hearth Project teapot...');

  useEffect(() => {
    const checkTeapot = async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/teapot`);
        setStatus(response.status);
        const payload = await response.json();
        setMessage(payload?.message || "I'm a teapot.");
      } catch {
        setMessage('The teapot endpoint is unavailable right now. Please check the backend server.');
      }
    };
    checkTeapot();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      {/* Hero */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
          <Coffee className="h-7 w-7 text-orange-500" />
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 dark:bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          418 — I'm a Teapot
        </span>

        <h1 className="mt-5 text-3xl font-black text-gray-900 dark:text-white">
          The Hearth Project Teapot Endpoint
        </h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed">
          This route honors HTTP 418: the server refuses to brew coffee because it is, permanently, a teapot.
        </p>
        <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Status check: {status ?? 'checking...'}</p>
      </div>

      {/* Song */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 mt-8">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">The Teapot Song</h2>

        <div className="mt-5 space-y-4 rounded-xl bg-gray-50 dark:bg-gray-800 px-6 py-5 text-sm italic leading-relaxed text-gray-600 dark:text-gray-400">
          <p>
            I'm a little teapot short and stout.<br />
            Here is my handle, here is my spout.<br />
            When the water's boiling, hear me shout,<br />
            "Tip me over, pour me out!"
          </p>
          <p>
            In The Hearth Project's stack this route has clout.<br />
            It keeps our HTTP easter eggs throughout.<br />
            If coffee is requested, we politely flout,<br />
            "Tip me over, pour some tea out!"
          </p>
        </div>

        <p className="mt-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>

        <div className="mt-6 overflow-hidden rounded-xl">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/eDHE6J9auSA"
              title="I'm a Little Teapot - The Kiboomers Preschool Songs & Nursery Rhymes"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link to="/" className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors no-underline inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Return to Home
        </Link>
      </div>
    </div>
  );
}

