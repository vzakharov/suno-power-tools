# Welcome to Vova’s Suno Power Tools!

This is (okay, will be) a collection of tools to help me make your experience with [Suno](https://suno.com) more comfortable and efficient. I started building it for my own use and fun, but I thought others might find it useful too. So here we are!

Here’s the one tool I have so far:

## Colony

Ever since I got deep into Suno, I found one overwhelming problem: I could not keep track of all the songs I’m creating and the connections (extensions, inpaintings, etc.) between clips that go into them. I needed a way to visualize my work and keep track of it all.

Colony is a tool that helps you do just that. Once everything’s set up and built, you’ll have an interface that looks and feels like this:

![ezgif-4-e235957564](https://github.com/user-attachments/assets/d51017cb-7d07-4dbd-8437-78c0c86e89fa)

(You can [download my example HTML](https://github.com/vzakharov/suno-power-tools/blob/main/suno_colony_example.html) to see how it looks and works.)


### Setup

To make things work, you’ll need to insert certain code into your [browser’s console](https://help.planday.com/en/articles/30207-how-to-open-the-developer-console-in-your-web-browser) and run it. This code will then start going through your songs and their connections, compiling a set of data that will be later used to build the graph you see above.

Now, this all can sound a bit scary or even dangerous. These are legitimate concerns, so I encourage you to:

* Have someone who knows a thing or two about web development study the contents of this repository before you run anything.
* Only use the code you find here — I cannot guarantee the safety of any other code you might find on the internet.

And still,
**EVEN WITH ALL THIS, I CANNOT GUARANTEE THE SAFETY OF YOUR DATA OR YOUR SUNO ACCOUNT**. This latter concern is non-trivial, as Suno’s terms of service prohibit reverse-engineering their app. I sincerely hope that, given the scope and intent of this project, — and all the safeguards I have in place to avoid misusing Suno’s Web API (such as rate limiting) — writing and publishing this code will not get me — or you — into any trouble. **BUT I CANNOT GUARANTEE THIS**.

### Fetching your data

First, a few technical notes on how the fetching process works:

* We will only fetch your _liked_ songs. We do this both to avoid abusing Suno’s Web API and to keep the data we’re working with manageable.
* We will also fetch all of their “ancestors” (up to the very first clip in the chain that ultimately led to the song), even if such ancestors were not liked themselves.
* We’re limiting any calls to the Web API to 1 per second to avoid getting rate limited or banned. This means that the fetching process will take a while. In my case, for example, I had around 8000 liked songs, and the API allows fetching 20 at a time, meaning we’re looking at around 7 minutes of fetching.
* If the script execution fails for any reason (lost connection, rate limited, etc.), you can simply run it again, and it will pick up where it left off.
* You _can_ reload the page after a fail. Your current fetching state is saved using a thing called IndexedDB, which is a browser-based database that persists even after you reload the page.
* **The save is only saved in case of an error!** If you want to reload your page while fetching is in progress, make sure to run `await vovas.colony.saveState()` in the console before you do so. The state will be automatically loaded after you reload the page (and paste the script again).


Now, let’s outline the steps to fetch your data:

1. Go to the script’s [compiled source code](https://github.com/vzakharov/suno-power-tools/blob/main/dist/colony.js) and copy it:

<img width="896" alt="Screenshot 2025-01-07 at 20 13 49" src="https://github.com/user-attachments/assets/090099f5-3f1c-4f64-9396-5e82d339d4e6" />

2. Go to your browser console, paste the copied code, and hit Enter.
3. Type `await vovas.colony.build()` and hit Enter.

The fetching script will start. Here’s how your console might look like after a short while:

<img width="756" alt="Screenshot 2025-01-07 at 20 09 18" src="https://github.com/user-attachments/assets/bbd532a6-c4b3-43a2-a7ee-8a6195f9b6df" />

If you’re into the techy part, you can go to the `Network` tab and see the calls being made to Suno’s Web API:

<img width="779" alt="Screenshot 2025-01-07 at 20 09 58" src="https://github.com/user-attachments/assets/09ec8ba1-4473-4827-b518-82f3199cc4bc" />

Now, if you have as many clips as I did (or more), you might want to go grab a coffee or something. The script will keep running until it’s done fetching all your songs. Just make sure you don’t close the tab or have your computer go to sleep.

If you run into an error, you might see something like this:

<img width="584" alt="Screenshot 2025-01-07 at 20 15 06" src="https://github.com/user-attachments/assets/baf6e0d5-fec6-4b57-94b0-13c40444823d" />

(You can also see in the image — not that you need this but — that you can type `vovas.colony.state` to make sure your data hasn’t been lost.)

5. In case of an error, run `await vovas.colony.build()` again, and the script will hopefully pick up where it left off:

<img width="571" alt="Screenshot 2025-01-07 at 20 16 42" src="https://github.com/user-attachments/assets/de05f0f2-80c9-44f4-9047-79c7d93af53b" />

Once the data is fetched, the script will need some more time (maybe a couple minutes) to build the links between your nodes. This is also not a trivial process, as Suno has all kinds of weird approaches to storing its data (for example, it doesn’t store the origin of a cropped clip, making us come up with all kinds of hacky ways to figure it out).

The process will look like this, probably with quite a few warnings (shown in yellow). These shouldn’t discourage you, but you might want to read into them to figure out what kind of stuff the script runs into:

<img width="585" alt="Screenshot 2025-01-07 at 20 21 34" src="https://github.com/user-attachments/assets/cad891a8-40e7-492e-a124-261fb81eb342" />

In the end, you will see a log like this:

<img width="437" alt="Screenshot 2025-01-07 at 20 34 33" src="https://github.com/user-attachments/assets/f329933d-7421-4c7e-acd2-a7f464da6ce6" />

This means you can type in `await vovas.colony.render()` and have your Colony graph loaded right in your Suno UI.

**Tip: close or shrink the console to have more space for the graph while it’s rendering. If you resize the window after the graph is rendered, it will NOT re-render to fit the new size due to technical limitations, unless you manually click the `Redraw` button.**

**Note that next time you paste the script, if the colony is already built, it will start rendering right away, without you having to run `await vovas.colony.render()` again.**

🎉

### Using Colony

Okay, I’m a bit tired of writing this README, so I’m hoping the UI will be intuitive enough for you to figure out how to use it.

Just some tips:

* Once your graph is stable after a few seconds of loading, uncheck the `Attract based on time` and `Attract to root clip` checkboxes — this will give your individual song “specimens” more space to breathe and a funner look.
* Clicking on a song-node starts playing it and opens its controls on the bottom left. You can click on the image there to open the song in Suno — or you can right-click the node right away to the same effect.
* Use the filter to filter your songs by name, style, date (in the YYYY-MM-DD format), or even its ID. The filter will also fetch any “related” clips — i.e. clips ultimately stemming from the same root clip as the one(s) you’re filtering by.
* If you run `await vovas.colony.render('3d')` (note the `'3d'` argument), you’ll get a 3D view of your graph. Tbf I find it a bit hard to navigate, but it’s fun to look at.

Enjoy — and let me know what you think, or ask any questions, on the [Discussions board](https://github.com/vzakharov/suno-power-tools/discussions)!

Yours,

Vova