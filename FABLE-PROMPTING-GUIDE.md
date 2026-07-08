# The Fable prompting guide (verbatim from the user)

Every time I show something I built with Fable, I get the same questions. "I can't get results like this." "How did you do that?" "There's no way that's real."

And people assume each one came out of some insanely complicated prompt, or that it took way more work than it actually did. It's usually the opposite. The demos are simpler than they look. I'm just using the model differently than most people are.

Fable is a real next-generation model. Prompt it the way you prompt the current ones and you'll get results like the current ones. Change how you prompt it, and how you think about what it can take on, and the door really opens.

Here's how I actually do it.

## Give it the goal, not the steps

The biggest change is that I stopped spelling out how to do things. With older models you had to specify how to do something, or they'd often wander off. Fable is the opposite. The more room you give it, the better it does.

So I hand it big, sweeping, underspecified work; the way you'd hand a goal to a brilliant person you trust and let them find the best way there. Except Fable is often better at figuring out the "how" than I am. Every step I dictate is just me overriding its judgment with mine, and mine is usually worse.

That feels risky at first, when you're used to controlling the details. What makes it safe is the next part.

## Set house rules so you can trust it

An underspecified goal works when you fence it with a few rules it can't cross. House rules are the handful of things you always want to be true, no matter how Fable gets to the goal.

For example, when I'm building an agent, models love to over-engineer. They'll reach for a regex filter to catch some specific case, when what I actually want is a prompt that describes the behavior and lets the model handle it. So one of my standing rules is basically: don't hard-code special cases, describe what you want in the agent's system prompt and let the agent reason.

And for extra protection, you can have Fable always hand a sub-agent one job: check the work against the house rules before anything is pushed. Now you can let Fable run wide open on the goal and still know it won't ship something that breaks the things you care about.

## Give it a real bar for "done"

If you tell Fable to make something "high quality," it stops at its own idea of good enough, which is usually lower than yours. So I don't use adjectives. I give it a bar it can check itself against, and I make that bar hard.

Sometimes I write the test myself… something concrete, like "a stranger can't tell our render from the real photo." Other times I don't even know how to measure the thing I want, so I hand that problem to Fable too.

For example, a friend was trying to clone a component library and was getting nowhere. Two things were wrong. First, he was building on top of ShadCN and trying to clone the components off of ShadCN, so Fable was fighting all of ShadCN's conventions instead of just building the components. And second, he had no way to say when it was done. He was just telling it "clone this."

So we did two things. We threw out ShadCN and started from scratch, because a component library is completely buildable from nothing and the existing code was just baggage. Then, since neither of us knew how to measure "does this match the original," we asked Fable to figure it out. It took a screen recording of the real components in use, turned it into a heat map of where everything moved, and kept working until its version matched. We never told it how to do that. We told it what "done" meant and let it invent the measuring stick.

One rule I never break here: whatever builds something never gets to grade it (the 'build' agent is often biased, and has a whole trajectory of 'why I made these decisions' that it can use to justify that it's done the job). I always have it spin up a separate Fable sub-agent with a fresh context window, point it at the real output (the actual pixels, the actual running app, etc.) and have it try to prove the thing is not passing.

## Loop it until it hits the bar (especially for creative tasks)

Once there's a bar, I put Fable on a loop against it and let it go. It builds, checks itself, finds the biggest gap, closes it, and goes again… for hours, sometimes days. I use /loop for this constantly, especially on creative work, where there's always something concrete to keep measuring against until it's actually there.

The whole point of the loop is that Fable never gets to decide it's finished. There's always a next gap. It stops when I say it's done, or when it genuinely can't find anything left to fix (which is rare, if you've set this up right).

One trick I use on every long run: I have Fable post its progress to Simple Markdown Editor (a Markdown editor that supports images, videos, html, and anything else, and is built agent-first). As it works, it keeps the doc updated with screenshots, notes, whatever shows where things stand. Then I can glance at my phone and see exactly how far along it is, and I can add comments anytime I want to adjust the agent's direction.

Another way I use the editor: it works as a shared workspace when I'm running multiple Fables at once. Simple Markdown Editor has a built-in Trello-style board and a Slack-like chat component, so the agents can post tasks for each other, claim them, ask questions, and flag conflicts. When a team of them is working on the same codebase, that one document becomes the coordination layer, and I can watch (or jump into) the whole conversation.

## Let it build on what you've already done

Fable gets better at something the more of it you've already done, so your old work becomes fuel for the new work.

The first real thing I built when Fable came out was a photorealistic 3D forest. I wrote that prompt more carefully than almost anything since, because I had no reference point… no example of the quality I wanted, no idea yet how to get there. It took real work to get the initial prompt right.

But once I had one great 3D scene, everything after it got easier. When I built the Hogwarts demo, I could just point Fable at the forest: here's the code, here's the quality bar, match this and go beyond it. I didn't have to re-explain any of it.

It goes further than reusing code. Fable can read the traces of my old Claude Code sessions… what it actually tried while building the forest, what worked and what didn't. So instead of telling it "use a separate sub-agent for each object in the scene," I can just say "read the forest traces and learn what worked." It picks up the approach on its own. Hogwarts came together far faster than the forest, mostly because of that.

## Get out of its way

Every time Fable has to stop and ask you something, you've lost time. So I clear the obstacles up front. For example, if I'm connecting it to a real-world service that costs money, I'll give it a budget instead of making it ask permission for every use. I tell it where the keys and credentials live. And I tell it, in writing, to make its own calls and only come back to me if it's truly blocked or hits something only I can decide.

The one exception is planning (but only for huge, extremely consequential things). On a really big build I want the plan before any code, and I want it to ask me everything it's unsure about up front. Once the plan is settled, it runs without stopping.

## Two ways I run this

Everything above is the same whether I'm shipping features or building a world (or anything else creative). What changes is the setup around it.

For engineering, I run a team. Several Fable sessions working at once, pulling tasks from wherever… a list, a Linear board, the Trello-style board in Simple Markdown Editor, or I just hand them out. Each one does its task, triple-checks its own work with sub-agents, and opens a PR with the evidence I mentioned. Then one more Fable does nothing but integrate: it merges the PRs, runs everything, tests like a real user, and keeps the whole thing green. When two features overlap, I tell one Fable to watch the other's traces as it's being built and stay compatible… they're working in parallel, so they can coordinate in the doc's chat… one keeps an eye on the other, flags conflicts as they come up, and integrates as it lands.

For creative work, I lean on momentum and detail. Same loop, same hard bar, but I usually fan out sub-agents to nail the individual pieces instead of making one Fable do all of it… a separate sub-agent perfecting each kind of tree in a forest, say. Sometimes I'll run a few completely separate attempts at once, keep the best one, and carry what worked into the next round.

You can mix these however you want. It depends on what you're building.

## When to spend on ultracode

There's a heavier mode called ultracode that costs a lot more. I almost never use it. A good loop with an ambitious enough goal gets me there without it.

Where it earns its cost is foundations. If I'm building a new system from scratch that I'll be working on for months (for example, something that becomes the core of a business or a codebase), I want the base right from day one. It's the same reason we threw out ShadCN: a good foundation makes everything you build on top of it easier, and a bad one makes everything harder forever. For that kind of work, and pretty much only that kind, the extra cost is worth it.

## One more thing

If this is a lot to hold in your head, you don't have to. Hand this whole article to your Fable and tell it to help you write your prompts from here on. It'll know what to do with it.

None of this is complicated. It's the same model everyone has. My results look different because I don't spoon-feed it, I hold it to a bar it can't talk its way out of, and I let it build on everything it's already made. Start there.
