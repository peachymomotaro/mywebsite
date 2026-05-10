CapstoneBO+: Bayesian optimisation under scarce feedback

I did a Machine Learning course at Imperial College in order to develop my ML skills. One of the required outputs was a black-box optimisation (BBO) challenge, which involved optimising eight functions. Each function took a continuous input vector and returned a single score. We had no information on the functions except for a series of previous inputs and output. I could not inspect their equations, gradients, or internal structure. 

In Algorithms to Live By, Brian Christian and Tom Griffiths discuss the exploit-explore trade-off. Is it worth listening to a new album that you might enjoy, or relistening to an old album that you know you do? This trade-off is complex and multifacted in any field it is applied to. This project was that trade-off writ large - should we explore new areas or exploit areas that already seemed promising? How do you make concrete decisions about those sorts of processes? 

In ordinary supervised learning you might often ask yourself the question: "How well does my model fit this data?" In black-box optimisation, because you are fitting a surrogate model to an unknown search space, the more germane question is: "What kind of data is my model causing me to collect?"

The surrogate model is doing two things. Firstly, it predicts which regions might have high values, and secondly, it estimates where the model is still uncertain. The optimiser can then use both signals when choosing the next experiment.

If you're really interested in the technical part (you can safely skip this!):

---
The preferred modelling path uses a Gaussian process with an additive linear plus Matérn kernel, and output transformations such as Box-Cox, sign-flipped Box-Cox, or Yeo-Johnson where useful. The functions were small-data, continuous, and expensive to query, so a Gaussian process was a natural starting point.

Once the surrogate is fitted, the pipeline generates a mixed pool of candidate points. The candidates were a mix global Sobol samples, designed to preserve broad coverage of the search space. Some are trust-region candidates, sampled locally around historically strong areas. Some are elite-region candidates, drawn from boxes around the best observed points.

Each candidate is then scored using several acquisition-style signals, including expected improvement (EI), log expected improvement (logEI), probability of improvement (PI), upper confidence bound set with a range of betas (UCB), Thompson-style scores, posterior uncertainty, and novelty. 
---

For the less technically minded, essentially, early on, exploration is valuable. Later, once strong regions have been found, exploitation becomes more effective.

Interactive demo

To make the idea easier to feel, I built a small browser game where you too can try to beat a Bayesian Optimiser. The player and a toy Gaussian-process optimiser search the same hidden two-dimensional landscape. The player chooses points manually. The optimiser chooses points using a portfolio of acquisition strategies. At the end, the true landscape is revealed.

This demo is obviously simpler than what a real project in this space might involve. It is two-dimensional, and uses a lightweight Gaussian process rather than a full BoTorch workflow. But hopefully it helps to explain the process - what exactly were we trying to achieve? 

There are plenty of scenarios where these decisions matter in the real world - drug design, robotics and engineering, and also designing ML pipelines themselves. For instance, choosing the hyperparameter settings of a neural network can be modelled as a Bayesian optimisation problem.
