export const blogUpdates = [
  {
    id: "the-illusion-of-intelligence",
    postTitle: "The Illusion of Intelligence",
    postUrl: "https://kingcnut.substack.com/p/the-illusion-of-intelligence",
    updates: [
      {
        date: "2026-08-29",
        note: `In *Human Capital: The Tragedy of the Education Commons* (Pelican, 2026), Guy Standing quotes Dennett telling the BBC:

“If we turn this wonderful technology we have for knowledge into a weapon for disinformation, we are in deep trouble ... because we won't know what we know, and we won't know who to trust, and we won't know whether we're informed or misinformed. We may become either paranoid and hyper-sceptical, or just apathetic and unmoved. Both of those are very dangerous avenues. And they're upon us.”

Dennett added that “AIs are likely to evolve to get themselves reproduced. And the ones that reproduce the best will be the ones that are the cleverest manipulators of us human interlocutors. The boring ones we will cast aside, and the ones that hold our attention we will spread. All this will happen without any intention at all. It will be natural selection of software."`,
        sourceUrl: "https://books.google.com/books/about/Human_Capital.html?id=oc81EQAAQBAJ",
        sourceTitle: "Guy Standing, Human Capital: The Tragedy of the Education Commons (2026)"
      }
    ]
  },
  {
    id: "review-essay-why-greatness-cannot-be-planned",
    postTitle: "Review Essay: Why Greatness Cannot Be Planned",
    postUrl: "https://kingcnut.substack.com/p/review-essay-why-greatness-cannot",
    updates: [
      {
        date: "2026-08-03",
        questionAuthor: "Derek James",
        question: `Maybe this is just being pedantic, and maybe you addressed it and I just missed it, but aren't search paradigms like novelty and interestingness still a form of objective search? The objective is just shifted to some other criteria. In the case of novelty to an unexplored location (or whatever criteria we're using for novelty) and interestingness definitely has some criteria, it just seems like we're relegating it to subconscious processes.`,
        responseAuthor: "Peter Curry",
        note: `I don't think this is a pedantic response, and it is something I grappled with when writing this. One of the reasons for the impreciseness of my language in the post is because the book extrapolates beyond search as it might be formally defined in computer science, to include fields such as evolution, furniture design and the authors helping art students to find purpose. Once you're out of that space, holding on to the strict definitions is less valuable.

So if we move back into that space, one way of thinking about this is that novelty search is not improving an individual candidate but the archive as a whole. So novelty search appears objectiveless as it is ignoring the overarching objective. But it does have an objective - to map some candidate solutions to the problem, and to map them in such a way so as to maximise a sparseness criterion around each candidate solution (i.e., we want our candidate solutions to cover the space).

This is just basic novelty search, but we can give it far more complex forms. For instance, in Bayesian optimisation, we are looking through a search space to get some reward. If we use the upper confidence bound (UCB) as our acquisition function, we get a parameter β. We can set β to different values depending on how valuable we believe unexplored space to be. As we sample over time we might start with an initially high β value, which favours exploration, moving to a lower one, which favours exploitation in a high-reward area of the search space.

All of search, whether in computer science or outside of it, is fundamentally about dealing with a really large space and trying to find a way to narrow it down such that you find things you want to find. What the OMNI researchers are arguing is that interestingness might be a pretty good way to narrow it down, because it seems to concentrate search on things that humans believe is worthwhile and novel.

I guess your point is maybe something like - but we have an objective then: find worthwhile and novel things! But the difficulty is that “find worthwhile and novel things” is not something we necessarily know how to do. So OMNI attempts to approximate that judgement.

Let's say we have an algorithm that controls the guy in Minecraft. If we just ask the algorithm to do novel things, it might just do the following tasks:

- collect 1 log

- collect 2 logs

- collect 3 logs

- collect 4 logs

Interestingness is a way of saying, no, we want you to go and explore spaces and interact with creatures and complete the game, without having to program any of that manually. Instead, feeding millions of reddit posts and YouTube videos to a foundation model may have inadvertently programmed those ideas in as interesting (because people like to discuss things which are worthwhile and novel).

I was trying to combine that argument with the work in Stanley and Lehman's book to say that interestingness can be deployed in a number of places, particularly in the scientific process. Interestingness is not the only way to cut down the search space, and other ways may rely less on the subconscious.

For now, it seems as if there may be a trade-off between having a more formal search process and finding less useful things, and having a less formal search process and finding more useful things.

If you'd like to read more:

[Novelty Search and the Problem with Objectives](https://www.cs.swarthmore.edu/~meeden/DevelopmentalRobotics/lehman_ecj11.pdf)

[Preliminary Analysis of Simple Novelty Search](https://direct.mit.edu/evco/article/32/3/249/116787/Preliminary-Analysis-of-Simple-Novelty-Search)`,
        sourceUrl: "https://www.theseedsofscience.pub/p/why-greatness-cannot-be-planned/comment/307589612",
        sourceTitle: "Original discussion thread"
      }
    ]
  },
  {
    id: "levels-on-levels-on-levels",
    postTitle: "Levels on Levels on Levels",
    postUrl: "https://kingcnut.substack.com/p/levels-on-levels-on-levels",
    updates: [
      {
        date: "2026-08-30",
        note: `I found an additional example of emergence in Thomas Nagel's [review](https://openyls.law.yale.edu/server/api/core/bitstreams/056e791f-4cfe-4061-a3ea-95a1dd37dfa1/content) of Robert Nozick's book *Anarchy, State and Utopia*:

> Nozick defends the procedure in a section entitled "Macro and Micro." He says: [C]omplex wholes are not easily scanned; we cannot easily keep track of everything that is relevant. The justice of a whole society may depend on its satisfying a number of distinct principles. These principles, though individually compelling (witness their application to a wide range of particular microcases), may yield surprising results when combined together. . . . [C]ne should not depend upon judgments about the whole as providing the only or even the major body of data against which to check one's principles, One major path to changing one's intuitive judgments about some complex whole is through seeing the larger and often surprising implications of principles solidly founded at the micro level.&#x20;
>
> ...
>
> Nozick's intuition is that each person is entitled to his talents and abilities, and to whatever he can make, get, or buy with his own efforts, with the help of others, or with plain luck. He is entitled to keep it or do anything he wants with it, and whomever he gives it to is thereby equally entitled to it. Moreover, anyone is entitled to whatever he ends up with as a result of the indefinite repetition of this process, over however many generations. I assume that most readers of Nozick's book will find no echo of this intuition in themselves, and will feel instead that they can develop no opinion on the universal principles of entitlement, acquisition and transfer of property, or indeed whether there are any such universal principles, without considering the significance of such principles in their universal application. One might even agree in part with Nozick's views about what people should do in the limited circumstances that define interpersonal relations in the state of nature, but not agree that the proper generalization of those judgments is their unmodified application to all cases no matter how complex or extended. They might be based instead on principles which give these results for small-scale individual transactions but rather different results for the specification of general conditions of entitlement to be applied on an indefinitely large scale.

> Sometimes it is proper to force people to do something even though it is not true that they should do it without being forced. It is acceptable to compel people to contribute to the support of the indigent by automatic taxation, but unreasonable to insist that in the absence of such a system they ought to contribute voluntarily. The latter is an excessively demanding moral position because it requires voluntary decisions that are quite difficult to make. Most people will tolerate a universal system of compulsory taxation without feeling entitled to complain, whereas they would feel justified in refusing an appeal that they contribute the same amount voluntarily.&#x20;`
      }
    ]
  }
];
