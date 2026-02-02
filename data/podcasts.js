const podcastShows = [
  {
    slug: "dansnow-history-hit",
    title: "Dan Snow’s History Hit",
    creditType: "show_level",
    role: "Producer / Researcher / Sound Editor / Video Editor",
    dateRange: "2018 – 2020",
    description:
      "Produced Dan Snow’s Podcast, the largest history podcast in the UK. At peak, helped produce up to six podcasts a week with academics, journalists, and public figures, leading guest research, pre-interviews, and briefing. Edited audio and video for filmed episodes, including sound design, mixing, and mastering, and liaised with hosts and guests to ensure high-quality recordings.",
    links: [
      {
        label: "Show page",
        url: "https://podcasts.apple.com/gb/podcast/dan-snows-history-hit/id1042631089"
      }
    ],
    notes:
      "Responsible for sourcing high-profile guests (e.g., Tony Blair, Anita Anand, Charles Moore, Tom Holland)."
  },
  {
    slug: "hidden-histories",
    title: "Hidden Histories",
    creditType: "credited_episodes",
    role: "Researcher / Producer / Editor",
    dateRange: "Jun 2020 – May 2021",
    description:
      "Researcher, producer, and editor for the Hidden Histories podcast with Helen Carr. Helped grow it to 100,000+ total listens and produced a series for the Arts and Humanities Research Council.",
    links: [
      {
        label: "Apple Podcasts",
        url: "https://podcasts.apple.com/gb/podcast/hidden-histories/id1454513867"
      }
    ],
    creditedEpisodes: [
      { title: "Sarah Goldsmith on the Grand Tour", date: "May 7, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title: "Emma Butcher on Coventry Cathedral", date: "May 1, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title: "Benjamin Kesley on the May Day Festival", date: "Apr 30, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title: "Tristram Hunt on the Mental Health Act", date: "Apr 28, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title: "Adam Smith on the Peasants Revolt", date: "Apr 23, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },

      { title: "Alejandra Irigoyen on Slave Traders", date: "Apr 10, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title: "Owen Davies on the History of Cunning Folk", date: "Apr 6, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title: "David Gange on British Cliffs", date: "Mar 26, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title: "Matt Cook on Gay Life in London", date: "Mar 12, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title: "Sarah Knott on the Legend of the Old West", date: "Feb 27, 2021", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },

      { title: "Victoria Donovan on the History of Soviet Housing", date: "Dec 17, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },
      { title: "Sam Goodman on the UK’s secret underground WW2 factories", date: "Dec 10, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },
      { title: "Michael Talbot on the history of Gaza", date: "Dec 2, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },
      { title: "Christienna Fryar on Britain’s Ghost signs", date: "Nov 26, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },

      { title: "Romesh Gunesekera and Michaela Hulme on Poverty in History", date: "Nov 19, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title: "People, Power and the Museums of Empire with Nigel Westmaas", date: "Nov 12, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title: "Lincoln Castle with Peter Evans", date: "Oct 12, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title: "Murderous Look into Victorian Medicine with Professor Tim Cooper", date: "Oct 7, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title: "Female Spies and the SOE with Dr Kate Vigurs", date: "Sep 26, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },

      { title: "Dark History of Surgery with Dr Lindsey Fitzharris", date: "Aug 28, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },
      { title: "Medieval Muslim Spain with Dr. Elizabeth Drayson", date: "Aug 15, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },
      { title: "Horror of Jim Crow with Mary Farmer", date: "Jul 25, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },
      { title: "Lost Boys of Imperial Britain with Dr Jane McCabe", date: "Jun 24, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },

      { title: "Witches with Professor Suzannah Lipscomb", date: "Jun 2, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title: "Lord Byron and his Origins with Emily Brand", date: "May 21, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title: "The History of Motherhood with Helen McCarthy", date: "May 16, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title: "The Five and Jack the Ripper with Hallie Rubenhold", date: "May 13, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title: "The Great Fire of London with Rebecca Rideal", date: "May 2, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },

      { title: "The Valkyries with Jh̤anna Katrn Friŗiksdt̤tir", date: "Apr 28, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title: "The Battle of Okinawa with Saul David", date: "Apr 18, 2020", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title: "Christmas Special with Dan Snow", date: "Dec 17, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title: "Going on Pilgrimage in the Middle Ages with Dr Emma Wells", date: "Dec 1, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title: "Medieval Rulers At The National Archives with Sean Cunningham", date: "Nov 24, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },

      { title: "The History of Crusading with Dan Jones", date: "Sep 8, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=8" },

      { title: "Elizabeth I with Dr Estelle Paranque", date: "Apr 15, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=9" },
      { title: "Women of the Tower of London with Lauren Johnson", date: "Apr 7, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=9" },

      { title: "Lighthouses with Tom Nancollas", date: "Apr 1, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title: "Marie of Romania with Tessa Dunlop", date: "Mar 17, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title: "Sir Walter Raleigh with Anna Beer", date: "Mar 10, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title: "Writing Historical Fiction and the Huguenots with Kate Mosse", date: "Mar 4, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title: "Prostitution with Hallie Ruben-Hold", date: "Mar 4, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title: "Joseph Lister with Lindsey Fitzharris", date: "Feb 27, 2019", url: "https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=11" }
    ],
    notes: "Selected credited episodes."
  },
    {
    slug: "killing-time",
    title: "Killing Time",
    creditType: "credited_episodes",
    role: "Researcher / Producer / Editor",
    dateRange: "May 2020 – May 2021",
    description:
      "Researched, produced, and edited Rebecca Rideal’s podcast about how famous figures have died throughout history. Extensive research and production on interviews.",
    links: [
      {
        label: "Apple Podcasts",
        url: "https://podcasts.apple.com/gb/podcast/killing-time-with-rebecca-rideal/id1507389410"
      }
    ],
    creditedEpisodes: [
      { title: "The life and times of Ignatius Sancho", date: "Mar 26, 2021", url: "https://killingtimepodcast.podbean.com/page/2/" },
      { title: "The Spy Who Loved", date: "Dec 16, 2020", url: "https://killingtimepodcast.podbean.com/page/2/" },
      { title: "The Rise and Fall of Shaka Zulu", date: "Dec 4, 2020", url: "https://killingtimepodcast.podbean.com/page/2/" },
      { title: "A Wartime Murder (with Duncan Barrett)", date: "Nov 20, 2020", url: "https://killingtimepodcast.podbean.com/page/2/" },
      { title: "The Mysterious Death of Amy Robsart", date: "Oct 22, 2020", url: "https://killingtimepodcast.podbean.com/page/2/" },
      { title: "The Sleepers of Barnes Cemetery (with Sheldon Goodman)", date: "Sep 25, 2020", url: "https://killingtimepodcast.podbean.com/page/2/" },

      { title: "The Murderess Sarah Malcolm", date: "Sep 1, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "Protestant Martyrs (with Leanda de Lisle)", date: "Aug 21, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "The Untimely Death of Alexander the Great (with Dr Maria Pretzler)", date: "Aug 14, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "The Tragedy of Apollo 1 (with Dallas Campbell)", date: "Jul 21, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "The Curse of King Tut (with Dr Amara Thornton)", date: "Jul 18, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "The Extraordinary Life of Frederick the Great (with Dan Vo)", date: "Jun 27, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "The Assassination of Thomas Becket (with Dr Emma Wells)", date: "Jun 19, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "Virgin Sacrifice in the Ancient World (with Bettany Hughes)", date: "Jun 11, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },

      { title: "The Irish Famine (with Stephen McGann)", date: "Jun 4, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" },
      { title: "The Brute Caravaggio (with Ferren Gipson)", date: "May 28, 2020", url: "https://killingtimepodcast.podbean.com/page/3/" }
    ],
    notes: "Selected credited episodes."
  },
  {
    slug: "sick-to-death",
    title: "Sick to Death",
    creditType: "all_episodes",
    role: "Researcher / Producer / Editor",
    dateRange: "Sep 2020 – Dec 2020",
    description:
      "Researcher, producer, and editor on a narrative podcast series with Rebecca Rideal about the history of medicine for the Sick to Death museum in Chester. Research, editing, music, and sound production on multiple interviews to weave them into a coherent package.",
    links: [
      {
        label: "Show page",
        url: "https://sicktodeath.org/the-sick-to-death-podcast/"
      }
    ],
    notes: "All episodes credited."
  },
  {
    slug: "private-parts",
    title: "Private Parts",
    creditType: "show_level",
    role: "Audio / Video Editing",
    dateRange: "Jun 2020 – Sep 2020",
    description: "Audio and video editing for a large celebrity podcast featuring Jamie Laing and Francis Boulle, two of the stars of Made in Chelsea.",
    links: [
      {
        label: "Show page",
        url: "https://shows.acast.com/privateparts/episodes/93-francis-doppelgangerw-ivograham-part1"
      }
    ],
    notes: "Show-level credit."
  },
  {
    slug: "mental-heads",
    title: "Mental Heads",
    creditType: "all_episodes",
    role: "Editor / Producer",
    dateRange: "Jun 2020 – Sep 2020",
    description:
      "Producer, editing and production work on a new podcast about mental health from two people who met in a mental hospital.",
    links: [
      {
        label: "Listen Notes",
        url: "https://www.listennotes.com/podcasts/mental-heads-emma-brown-paul-new-CtIjWPJTypi/#podcast"
      }
    ],
    notes: "All episodes credited."
  },
];

export default podcastShows;
