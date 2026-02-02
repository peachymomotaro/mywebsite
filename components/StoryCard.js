export default function StoryCard({ story }) {
  const [firstParagraph, ...rest] = story.paragraphs;

  return (
    <article className="card story-card">
      <h3>{story.title}</h3>
      {story.subtitle ? <div className="card-meta">{story.subtitle}</div> : null}
      <p>{firstParagraph}</p>
      {rest.length > 0 ? (
        <details>
          <summary>Read more</summary>
          {rest.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </details>
      ) : null}
    </article>
  );
}
