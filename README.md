# Welcome to Vova’s Suno Power Tools!

This is (okay, will be) a collection of tools to help me make your experience with [Suno](https://suno.com) more comfortable and efficient. I started building it for my own use and fun, but I thought others might find it useful too. So here we are!

Here’s the one tool I have so far:

## Colony

Ever since I got deep into Suno, I found one overwhelming problem: I could not keep track of all the songs I’m creating and the connections (extensions, inpaintings, etc.) between clips that go into them. I needed a way to visualize my work and keep track of it all.

Colony is a tool that helps you do just that. Once everything’s set up and built, you’ll have an interface that looks and feels like this:

![ezgif-4-e235957564](https://github.com/user-attachments/assets/d51017cb-7d07-4dbd-8437-78c0c86e89fa)

Unfortunately, the barrier to entry is a bit high right now. Suno doesn’t provide a web API to access your data, so you’ll have to do some manual work not unlike hotwiring a car. But if you’re up for it, here’s how you can get started:

### Setup

Here’s the thing. We need to fetch all our songs from Suno, but we can’t do that without a web API. So what we’ll be doing is something like:

* Finding a place in Suno’s web app code that fetches your songs
* Placing a breakpoint there (think of it as plugging a wire after tearing open your car’s dashboard)
* “Stealing” Suno’s own internal methods to fetch your songs, which our script will then use

Now, this all can sound a bit scary or even dangerous. These are legitimate concerns, so I encourage you to:

* Have someone who knows a thing or two about web development study the contents of this repository before you run anything.
* Only use the code you find here — I cannot guarantee the safety of any other code you might find on the internet.

And still,
**EVEN WITH ALL THIS, I CANNOT GUARANTEE THE SAFETY OF YOUR DATA OR YOUR SUNO ACCOUNT**. This latter concern is non-trivial, as Suno’s terms of service prohibit reverse-engineering their app. I sincerely hope that, given the scope and intent of this project, — and all the safeguards I have in place to avoid misusing Suno’s Web API (such as rate limiting) — writing and publishing this code will not get me — or you — into any trouble. **BUT I CANNOT GUARANTEE THIS**.

Okay, with this out of the way, here’s how you can set up Colony:

**Note: I have only tested this on Google Chrome, and you’ll have to figure out respective equivalents for other browsers if you’re using them.**

I will put screenshots under groups of steps to make it easier for you to follow along.

1. Go to the https://suno.com/create
2. Open the [Browser console](https://help.planday.com/en/articles/30207-how-to-open-the-developer-console-in-your-web-browser).
3. On the left, find a call that says `/api/feed/v2` and click on it.
4. On the top right, click on the `Initiator` tab.
5. In the `Request call stack` that opens (you might need to unfold it), fint a line that says `GET`.
6. You do **NOT** need this line, but you need the one under it — this is where the web app makes a call to fetch your songs.
7. Click on the file name to the right of that line. This will open the file and the line of code that makes the call in the `Sources` tab.

<img width="623" alt="Screenshot 2025-01-07 at 19 31 09" src="https://github.com/user-attachments/assets/31b68a89-8290-4b1a-8fe3-b08223b2a1b4" />

8. Once taken to the `Sources` tab, put a breakpoint (see screenshot below) — this is our way of “plugging in” to the web app’s code.
9. Reload the page.

<img width="621" alt="Screenshot 2025-01-07 at 19 21 58" src="https://github.com/user-attachments/assets/2dabf15f-0ee4-4765-b3dc-5d0f0b7089ff" />

10. Once you reload the page, the web app will stop at the breakpoint you set. This is where you’ll “steal” the method that fetches your songs.
11. Click on the breakpoint (the blue box) again to avoid stopping at it the next time the web app makes a call to fetch your songs.
12. Go to the `Console` tab.

<img width="632" alt="Screenshot 2025-01-07 at 19 23 38" src="https://github.com/user-attachments/assets/953b0f4c-edfd-4930-8dcf-c299d58d9fe2" />

13. In the console, type, literally, `suno=this`. What we’re doing is saving the current context of the web app to a variable called `suno`, which our script will use down the line.
14. Click on the ▶️ button to the left (see screenshot below) to continue running the web app.

<img width="670" alt="Screenshot 2025-01-07 at 19 27 00" src="https://github.com/user-attachments/assets/9b8070fb-1e76-4add-9338-2c6a5165f276" />

With that, our environment is all set up to actually start fetching your data!

### Fetching your data

Now, let’s fetch those songs of yours. Here are some things to keep in mind:

* We will only fetch your _liked_ songs. We do this both to avoid abusing Suno’s Web API and to keep the data we’re working with manageable.
* We will also fetch all of their “ancestors” (up to the very first clip in the chain that ultimately led to the song), even if such ancestors were not liked themselves.
* We’re limiting any calls to the Web API to 1 per second to avoid getting rate limited or banned. This means that the fetching process will take a while. In my case, for example, I had around 8000 liked songs, and the API allows fetching 20 at a time, meaning we’re looking at around 7 minutes of fetching.
* If the script execution fails for any reason (lost connection, rate limited, etc.), you can simply run it again, and it will pick up where it left off.
* You _can_ reload the page after a fail (making sure you follow the steps outlined in the `Setup` section). Your current fetching state is saved using a thing called IndexedDB, which is a browser-based database that persists even after you reload the page.

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

This means you can type in `await vovas.colony.render()` and have your Colony graph loaded in a new tab!

🎉

### Using Colony

Okay, I’m a bit tired of writing this README, so I’m hoping the UI will be intuitive enough for you to figure out how to use it.

Just some tips:

* Once your graph is stable after a few seconds of loading, uncheck the `Attract based on time` and `Attract to root clip` checkboxes — this will give your individual song “specimens” more space to breathe and a funner look.
* Clicking on a song-node starts playing it and opens its controls on the bottom left. You can click on the image there to open the song in Suno — or you can right-click the node right away to the same effect.
* Use the filter to filter your songs by name, style, date (in the YYYY-MM-DD format), or even its ID. The filter will also fetch any “related” clips — i.e. clips ultimately stemming from the same root clip as the one(s) you’re filtering by.
* You can also open your graph again by going to the console, copying and pasting the script, and running `await vovas.colony.render()` — no breakpoint shenanigans needed this time.
* If you run `await vovas.colony.render('3d')` (note the `'3d'` argument), you’ll get a 3D view of your graph. Tbf I find it a bit hard to navigate, but it’s fun to look at.
* Run `await vovas.colony.renderToFile()` to render your graph to an HTML file that you can freely move around and share with others (it will include all the data you have fetched).

Enjoy — and let me know what you think, or ask any questions, on the [Discussions board](https://github.com/vzakharov/suno-power-tools/discussions)!

Yours,

Vova
