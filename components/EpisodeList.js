export default function EpisodeList({ episodes = [] }) {
  const renderTitle = (title) =>
    title === "Made in Chelsea" ? <em>{title}</em> : title;

  return (
    <details className="episode-list" open={false}>
      <summary className="episode-toggle">
        Show credited episodes ({episodes.length})
      </summary>
      {episodes.length === 0 ? (
        <p className="card-meta">No episodes listed yet.</p>
      ) : (
        <ul>
          {episodes.map((episode) => (
            <li className="episode-item" key={episode.url || episode.title}>
              <a
                href={episode.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {renderTitle(episode.title)}
              </a>
              {episode.date ? (
                <span className="episode-meta">{episode.date}</span>
              ) : null}
              {episode.creditLine ? (
                <span className="episode-meta">{episode.creditLine}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
