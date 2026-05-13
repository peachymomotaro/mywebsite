Bayesian optimisation is a general attitude to a problem. 

We start with a belief about what the world looks like, then we test that belief, and then we update our belief based on that test. In this case, using the Gaussian process is a way of doing that.

One way to think about Gaussian processes is to imagine you're in a big flat field, which is 1km x 1km. You know that at some point, below the field is gold, that if you dig a big hole you can get at. You really want the gold because you want to buy a big shiny pair of boots in Goldtown, next door.

We're trying to answer the question: Where should you dig? You don't really want to dig everywhere, because that's far too much work and you might not hit anything if you dig in a really bad spot.

But if you dig in too few places, then you might not find the places where the gold is closest to the surface. In this case, iamgine that our friend has already dug in three random spots, and they tell you how far down the gold is there. For humans, in two or three dimensions, with a few data points, this task is fun. You can guess yourself where the good spots are. 

But we want to be able to model this using a computer. This is because we sometimes have problems in more than three dimensions, or where there are too many datapoints for humans to easily understand.

So before we dig at all, we make an assumption.

We assume the gold is going to be distributed in a relatively even way, i.e. we will find areas with clumps of gold and some areas with no gold. This assumption can be changed. We can change this assumption about the distribution using something called a kernel. 

But for now, just imagine we make a uniform guess what the distribution of gold is like underground.

What we then do is use a computer to imagine this as a surface, where we draw hundreds of possible distributions of the gold and take an average of those. And then that helps us guess where we should dig, before we do any work at all! That is the nefarious optimiser you are playing against in this game. 