export default function PodcastShowCard({ show, children }) {
  return (
    <article className="card podcast-card">
      <div className="podcast-card-header">
        <h3 className="card-title">{show.title}</h3>
      </div>
      <div className="podcast-role">
        {show.role}
        {show.dateRange ? ` · ${show.dateRange}` : ""}
      </div>
      {show.description ? <p>{show.description}</p> : null}
      {show.notes ? <p className="card-meta">{show.notes}</p> : null}
      {show.links && show.links.length > 0 ? (
        <div className="link-row">
          {show.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      {children}
    </article>
  );
}
