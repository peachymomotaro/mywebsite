// Data structure for podcast episode credits.
// type PodcastCredit = {
//   showTitle: string;
//   showUrl: string;
//   myName: string;
//   episodes: Array<{
//     title: string;
//     published: string;
//     role: string;
//     creditText: string;
//     source: string;
//   }>;
// };

const PODCAST_CREDITS = [
  {
    showTitle: "Hidden Histories",
    showUrl: "https://podcasts.apple.com/gb/podcast/hidden-histories/id1454513867",
    myName: "Peter Curry",
    episodes: [
      // Producer: Peter Curry
      { title:"Sarah Goldsmith on the Grand Tour", published:"May 7, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title:"Emma Butcher on Coventry Cathedral", published:"May 1, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title:"Benjamin Kesley on the May Day Festival", published:"Apr 30, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title:"Tristram Hunt on the Mental Health Act", published:"Apr 28, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },
      { title:"Adam Smith on the Peasants Revolt", published:"Apr 23, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast" },

      { title:"Alejandra Irigoyen on Slave Traders", published:"Apr 10, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title:"Owen Davies on the History of Cunning Folk", published:"Apr 6, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title:"David Gange on British Cliffs", published:"Mar 26, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title:"Matt Cook on Gay Life in London", published:"Mar 12, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },
      { title:"Sarah Knott on the Legend of the Old West", published:"Feb 27, 2021", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=2" },

      { title:"Victoria Donovan on the History of Soviet Housing", published:"Dec 17, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },
      { title:"Sam Goodman on the UK’s secret underground WW2 factories", published:"Dec 10, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },
      { title:"Michael Talbot on the history of Gaza", published:"Dec 2, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },
      { title:"Christienna Fryar on Britain’s Ghost signs", published:"Nov 26, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=3" },

      { title:"Romesh Gunesekera and Michaela Hulme on Poverty in History", published:"Nov 19, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title:"People, Power and the Museums of Empire with Nigel Westmaas", published:"Nov 12, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title:"Lincoln Castle with Peter Evans", published:"Oct 12, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title:"Murderous Look into Victorian Medicine with Professor Tim Cooper", published:"Oct 7, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },
      { title:"Female Spies and the SOE with Dr Kate Vigurs", published:"Sep 26, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=4" },

      { title:"Dark History of Surgery with Dr Lindsey Fitzharris", published:"Aug 28, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },
      { title:"Medieval Muslim Spain with Dr. Elizabeth Drayson", published:"Aug 15, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },
      { title:"Horror of Jim Crow with Mary Farmer", published:"Jul 25, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },
      { title:"Lost Boys of Imperial Britain with Dr Jane McCabe", published:"Jun 24, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=5" },

      { title:"Witches with Professor Suzannah Lipscomb", published:"Jun 2, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title:"Lord Byron and his Origins with Emily Brand", published:"May 21, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title:"The History of Motherhood with Helen McCarthy", published:"May 16, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title:"The Five and Jack the Ripper with Hallie Rubenhold", published:"May 13, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },
      { title:"The Great Fire of London with Rebecca Rideal", published:"May 2, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=6" },

      { title:"The Valkyries with Jh̤anna Katrn Friŗiksdt̤tir", published:"Apr 28, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title:"The Battle of Okinawa with Saul David", published:"Apr 18, 2020", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title:"Christmas Special with Dan Snow", published:"Dec 17, 2019", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title:"Going on Pilgrimage in the Middle Ages with Dr Emma Wells", published:"Dec 1, 2019", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },
      { title:"Medieval Rulers At The National Archives with Sean Cunningham", published:"Nov 24, 2019", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=7" },

      { title:"The History of Crusading with Dan Jones", published:"Sep 8, 2019", role:"Producer", creditText:"Producer: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=8" },

      // Producer: Natt Tapley — Audio: Peter Curry
      { title:"Elizabeth I with Dr Estelle Paranque", published:"Apr 15, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=9" },
      { title:"Women of the Tower of London with Lauren Johnson", published:"Apr 7, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=9" },

      { title:"Lighthouses with Tom Nancollas", published:"Apr 1, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title:"Marie of Romania with Tessa Dunlop", published:"Mar 17, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title:"Sir Walter Raleigh with Anna Beer", published:"Mar 10, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title:"Writing Historical Fiction and the Huguenots with Kate Mosse", published:"Mar 4, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title:"Prostitution with Hallie Ruben-Hold", published:"Mar 4, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=10" },
      { title:"Joseph Lister with Lindsey Fitzharris", published:"Feb 27, 2019", role:"Audio", creditText:"Audio: Peter Curry", source:"https://www.podbean.com/podcast-detail/zkf2u-8793d/Hidden-Histories-Podcast?page=11" }
    ]
  },

  {
    showTitle: "Killing Time with Rebecca Rideal",
    showUrl: "https://podcasts.apple.com/gb/podcast/killing-time-with-rebecca-rideal/id1507389410",
    myName: "Peter Curry",
    episodes: [
      { title:"The life and times of Ignatius Sancho", published:"Mar 26, 2021", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/2/" },
      { title:"The Spy Who Loved", published:"Dec 16, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/2/" },
      { title:"The Rise and Fall of Shaka Zulu", published:"Dec 4, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/2/" },
      { title:"A Wartime Murder (with Duncan Barrett)", published:"Nov 20, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/2/" },
      { title:"The Mysterious Death of Amy Robsart", published:"Oct 22, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/2/" },
      { title:"The Sleepers of Barnes Cemetery (with Sheldon Goodman)", published:"Sep 25, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/2/" },

      { title:"The Murderess Sarah Malcolm", published:"Sep 1, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"Protestant Martyrs (with Leanda de Lisle)", published:"Aug 21, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"The Untimely Death of Alexander the Great (with Dr Maria Pretzler)", published:"Aug 14, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"The Tragedy of Apollo 1 (with Dallas Campbell)", published:"Jul 21, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"The Curse of King Tut (with Dr Amara Thornton)", published:"Jul 18, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"The Extraordinary Life of Frederick the Great (with Dan Vo)", published:"Jun 27, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"The Assassination of Thomas Becket (with Dr Emma Wells)", published:"Jun 19, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"Virgin Sacrifice in the Ancient World (with Bettany Hughes)", published:"Jun 11, 2020", role:"Producer/editor", creditText:"Producer/editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },

      { title:"The Irish Famine (with Stephen McGann)", published:"Jun 4, 2020", role:"Editor", creditText:"Editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" },
      { title:"The Brute Caravaggio (with Ferren Gipson)", published:"May 28, 2020", role:"Editor", creditText:"Editor: Peter Curry", source:"https://killingtimepodcast.podbean.com/page/3/" }
    ]
  }
];

export default PODCAST_CREDITS;
