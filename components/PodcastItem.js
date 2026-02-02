export default function PodcastItem({ podcast }) {
  return (
    <article className="card podcast-item">
      <h3>{podcast.title}</h3>
      <div className="podcast-role">{podcast.role}</div>
      <p>{podcast.description}</p>
      <a href={podcast.url} target="_blank" rel="noopener noreferrer">
        Visit podcast
      </a>
    </article>
  );
}
