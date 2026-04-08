import { useEffect, useState } from 'react';

function TeapotPage() {
  const [status, setStatus] = useState<number | null>(null);
  const [message, setMessage] = useState(
    'Brewing response from the Hearth Haven teapot...'
  );

  useEffect(() => {
    const checkTeapot = async () => {
      try {
        const response = await fetch('https://localhost:7052/teapot');
        setStatus(response.status);

        const payload = await response.json();
        setMessage(payload?.message || "I'm a teapot.");
      } catch {
        setMessage(
          'The teapot endpoint is unavailable right now. Please check the backend server.'
        );
      }
    };

    checkTeapot();
  }, []);

  return (
    <main className="teapot-page">
      <section className="teapot-hero card">
        <span className="teapot-badge">
          <span className="teapot-badge-dot"></span>
          418 - I'm a Teapot
        </span>

        <h1>Hearth Haven Teapot Endpoint</h1>
        <p className="muted teapot-lead">
          This route honors HTTP 418: the server refuses to brew coffee because
          it is, permanently, a teapot.
        </p>
        <p className="muted">Status check: {status ?? 'checking...'}</p>
      </section>

      <section className="teapot-content card">
        <h2>The Teapot Song</h2>

        <div className="teapot-song">
          <p>
            I'm a little teapot short and stout.
            <br />
            Here is my handle, here is my spout.
            <br />
            When the water's boiling, hear me shout,
            <br />
            "Tip me over, pour me out!"
          </p>
          <p>
            In Hearth Haven's stack this route has clout.
            <br />
            It keeps our HTTP easter eggs throughout.
            <br />
            If coffee is requested, we politely flout,
            <br />
            "Tip me over, pour some tea out!"
          </p>
        </div>

        <p className="muted">{message}</p>

        <div className="teapot-video">
          <div className="teapot-video-inner">
            <iframe
              src="https://www.youtube.com/embed/eDHE6J9auSA"
              title="I'm a Little Teapot - The Kiboomers Preschool Songs & Nursery Rhymes"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      <footer className="teapot-footer">
        <a className="btn-primary" href="/">
          Return to home
        </a>
      </footer>
    </main>
  );
}

export default TeapotPage;
