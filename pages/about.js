import Head from "next/head";

export const cvContent = {
  intro: {
    headline:
      "I'm a researcher and producer focused on clear communication, systems thinking, and human-centered AI tools.",
    paragraphs: [
      "Researcher and AI implementation consultant. I make technical ideas accessible, and I work with organisations to actually get use out of AI tools, bridging cognitive principles with real workflows.",
      "Previously I was a senior researcher for Source Global Research, producing high-quality research and analysis for clients in a range of sectors.",
      "Before that, I was a podcast producer and researcher on the UK's largest history podcast, alongside producing and supporting a range of other shows."
    ],
    cvDownload: {
      label: "Download CV (PDF)",
      href: "/CV.pdf"
    }
  },

  education: [
    {
      qualification:
        "Professional Certificate in Machine Learning and Artificial Intelligence",
      institution: "Imperial College London",
      dates: "Oct 2025 - May 2026 (in progress)",
      details: [
        "Deepening my understanding of ML and AI concepts, algorithms, and applications.",
        "Hands-on experience with Python programming, data analysis, and model implementation.",
        "Currently working on a capstone project applying Bayesian optimisation to real-world data sets."
      ]
    },
    {
      qualification: "MSc Cognitive Neuroscience (Distinction)",
      institution: "Birkbeck, University of London",
      dates: "2022-2023",
      details: [
        "Dissertation: Predictive Processing (experimental design + Bayesian statistical analysis using PsychoPy and SPSS).",
        "Studied how low-level perception and high-level inference combine in a Bayesian framework to generate perception."
      ]
    },
    {
      qualification: "MA History (2.1)",
      institution: "University of Cambridge",
      dates: "2018",
      details: [
        "Thesis on the role of Black radio DJs in the 1950s, based on archival research at the Library of Congress.",
        "Aiming to examine the role of disc jockeys in translating the purchasing power of African-American audiences at the outset of the civil rights movement."
      ]
    }
  ],

  experience: [
    {
      title: "Consultant",
      organisation: "Chatham House",
      location: "London, UK",
      dates: "Sep 2025 - Present",
      bullets: [
        "Coordinating a collaborative project integrating generative AI into foresight workshop design (Sustainability Accelerator + futurists).",
        "Designing workshop processes and materials informed by cognitive science to create durable shifts in participants' thinking and decision-making.",
        "Building and iterating Python + OpenAI API tooling for early-signal research curation (\"Seeds of the Future\").",
        "Producing facilitation-ready outputs (briefs, prompts, workshop artefacts) and supporting pilot delivery; synthesising feedback into next iterations."
      ]
    },
    {
      title: "Senior Research and AI Implementation Analyst",
      organisation: "Source Global Research",
      location: "London, UK",
      dates: "2024 - 2025",
      bullets: [
        "Led end-to-end analysis projects for tier-one consulting firms, from scoping and data collection to executive reporting.",
        "Primary author on executive-facing reports (market sizing, competitor performance, client perceptions), shaping strategic direction in areas including Financial Services.",
        "Designed and executed mixed-methods research: large-scale surveys, senior executive interviews, thematic synthesis, and statistical analysis.",
        "Built AI-enabled workflow improvements (Python automation for marketing/presentation creation), saving ~8 hours per report per writer.",
        "Designed and delivered AI training for 50+ colleagues; provided 1:1 support to embed tools in day-to-day workflows."
      ]
    },
    {
      title: "Family Therapy Textbook",
      organisation: "Freelance (Ros Draper)",
      location: "London, UK",
      dates: "2022 - 2023",
      bullets: [
        "Research, writing, and copyediting for a new edition of <a href="https://www.mheducation.co.uk/an-introduction-to-family-therapy-systemic-theory-and-practice-9780335251827-emea-group" target="_blank" rel="noopener noreferrer"> "An Introduction to Family Therapy" </a>, the definitive textbook in the field.",
        "Produced postscripts on the history of key figures in family therapy, involving significant archival research."
      ]
    },
    {
      title: "School of International Futures",
      organisation: "Guy's & St Thomas' Hospital",
      location: "London, UK",
      dates: "2021 - 2023",
      bullets: [
        "Researcher on a futures project about food and childhood obesity.",
        "Conducted extensive desk research across varied sources and contributed systems thinking models.",
        "Research and note-taking for a project with Chatham House and government stakeholders on strategies for reaching Net Zero by 2030."
      ]
    },
    {
      title: "Producer & Researcher",
      organisation: "Dan Snow's History Hit",
      location: "London, UK",
      dates: "2018 - 2020",
      bullets: [
        "Producer of the country's leading history podcast at the time, with research and content planning for podcast episodes (interview briefs + scripted questions). The podcast regularly featured high-profile guests and academics and most episodes had over 200,000 downloads.",
        "Managed relationships with high-profile guests (including former UK Prime Minister Tony Blair).",
        "Researched, shot, and edited a 30-minute Battle of Britain documentary from concept/script through on-location filming and final cut."
      ]
    },
        {
      title: "Copyeditor",
      organisation: "Children's publishing",
      location: "London, UK",
      dates: "2025",
      bullets: [
        "Copyedited the children's book \"Marmosette in Lockdown\", shaping tone, structure, and clarity while ensuring consistency across chapters."
      ]
    },
  ],

  skills: [
    {
      group: "Writing & communication",
      items: [
        "Science writing (technical ideas to clear narratives)",
        "Report writing & editorial",
        "Stakeholder management",
        "Script writing & interviewing",
        "Public speaking"
      ]
    },
    {
      group: "Research & analysis",
      items: [
        "Mixed-methods research (surveys + executive interviews)",
        "Thematic synthesis",
        "Market sizing & trend identification",
        "Statistical analysis & modelling (SPSS)"
      ]
    },
    {
      group: "Technical",
      items: [
        "LLM prototyping (OpenAI APIs, prompt design)",
        "Machine learning fundamentals",
        "Supervised and unsupervised learning",
        "Model evaluation and validation",
        "Feature engineering and preprocessing",
        "Statistics and probability",
        "Python",
        "Advanced Excel",
        "PowerPoint",
        "Tableau",
        "PsychoPy",
        "Adobe Premiere Pro"
      ]
    }
  ]
};

const formatMeta = (parts) => parts.filter(Boolean).join(" | ");

export default function About() {
  const { intro, education, experience, skills } = cvContent;
  const ongoingEducation = education.filter((item) =>
    item.qualification.toLowerCase().includes("machine learning")
  );
  const ongoingExperience = experience.filter(
    (role) => role.organisation === "Chatham House"
  );
  const pastExperience = experience.filter(
    (role) => role.organisation !== "Chatham House"
  );
  const pastEducation = education.filter(
    (item) => !item.qualification.toLowerCase().includes("machine learning")
  );

  return (
    <>
      <Head>
        <title>About &amp; CV — Peter Curry</title>
        <meta
          name="description"
          content="Background and CV for Peter Curry, including education, experience, and project work."
        />
      </Head>

      <section>
        <h1>About &amp; CV</h1>
        <p className="lead">{intro.headline}</p>
        {intro.paragraphs.map((paragraph, index) => (
          <p key={`intro-${index}`}>{paragraph}</p>
        ))}
        <p>
          <a href={intro.cvDownload.href} target="_blank" rel="noopener noreferrer">
            {intro.cvDownload.label}
          </a>
        </p>
      </section>

      <section>
        <h2>Ongoing</h2>
        <div className="list">
          {ongoingExperience.map((role, index) => (
            <article className="card" key={`ongoing-exp-${index}`}>
              <h3 className="card-title">{role.title}</h3>
              <div className="card-meta">
                {formatMeta([role.organisation, role.location, role.dates])}
              </div>
              {role.bullets && role.bullets.length > 0 ? (
                <ul>
                  {role.bullets.map((bullet, bulletIndex) => (
                    <li key={`ongoing-exp-${index}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
          {ongoingEducation.map((item, index) => (
            <article className="card" key={`ongoing-edu-${index}`}>
              <h3 className="card-title">{item.qualification}</h3>
              <div className="card-meta">
                {formatMeta([item.institution, item.dates])}
              </div>
              {item.details && item.details.length > 0 ? (
                <ul>
                  {item.details.map((detail, detailIndex) => (
                    <li key={`ongoing-edu-${index}-${detailIndex}`}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Experience</h2>
        <div className="list">
          {pastExperience.map((role, index) => (
            <article className="card" key={`exp-${index}`}>
              <h3 className="card-title">{role.title}</h3>
              <div className="card-meta">
                {formatMeta([role.organisation, role.location, role.dates])}
              </div>
              {role.bullets && role.bullets.length > 0 ? (
                <ul>
                  {role.bullets.map((bullet, bulletIndex) => (
                    <li key={`exp-${index}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Education</h2>
        <div className="list">
          {pastEducation.map((item, index) => (
            <article className="card" key={`edu-${index}`}>
              <h3 className="card-title">{item.qualification}</h3>
              <div className="card-meta">
                {formatMeta([item.institution, item.dates])}
              </div>
              {item.details && item.details.length > 0 ? (
                <ul>
                  {item.details.map((detail, detailIndex) => (
                    <li key={`edu-${index}-${detailIndex}`}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Skills</h2>
        <div className="list">
          {skills.map((skillGroup, index) => (
            <article className="card" key={`skill-${index}`}>
              <h3 className="card-title">{skillGroup.group}</h3>
              <ul>
                {skillGroup.items.map((item, itemIndex) => (
                  <li key={`skill-${index}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
