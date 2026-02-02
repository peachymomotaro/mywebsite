import Head from "next/head";
import podcastShows from "../data/podcasts";
import PodcastShowCard from "../components/PodcastShowCard";
import EpisodeList from "../components/EpisodeList";

export default function Podcasts() {
  const shows = podcastShows;

  return (
    <>
      <Head>
        <title>Podcasts — Peter Curry</title>
        <meta
          name="description"
          content="Podcast credits and episode listings produced, edited, and hosted by Peter Curry."
        />
      </Head>
      <section>
        <h1>Podcasts</h1>
        <p className="lead">A selection of shows I’ve produced and edited.</p> 
        <p className="small">Some episodes are not listed here because they are now behind a paywall (particularly those from Dan Snow’s History Hit).</p>
      </section>

      <section>
        <div className="list">
          {shows.map((show) => (
            <PodcastShowCard key={show.slug} show={show}>
              {show.creditType === "credited_episodes" ? (
                <EpisodeList episodes={show.creditedEpisodes} />
              ) : null}
            </PodcastShowCard>
          ))}
        </div>
      </section>
    </>
  );
}
