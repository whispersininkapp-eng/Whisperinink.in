export interface CuratedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  title: string;
  content: string;
  tags: string[];
  mood: string;
  likesCount: number;
  commentCount: number;
  createdAt: {
    toDate: () => Date;
  };
}

export const curatedWritings: CuratedPost[] = [
  {
    id: "dostoevsky_insomniac_ledger",
    authorId: "abhinav_the_scribe",
    authorName: "Abhinav (Inspired by Dostoevsky)",
    authorPhoto: "https://lh3.googleusercontent.com/a/default-user=s96-c",
    title: "Notes from the Insomniac’s Ledger",
    content: `I am a sick man... i am a spiteful man. That is what I should tell you. But I am too cowardly to even be spiteful. 

At 3:14 AM on a Tuesday, when the cold tea has formed a thin film like grey ice, I sit before this blank box and ask who invented the cruelty of consciousness. It is not that I cannot sleep; it is that sleep has judged me and found me unworthy of its silence. 

To think is a disease—a real, malignant, physical disease. A simple beast does not overthink its own claws; a dog does not lay awake questioning if its bark is a genuine expression of its soul or merely a manufactured echo to please its master. But we, the children of the inkwell, we dissect our own ventricles with dirty scalpels and call it art. 

I wrote a letter once to a woman whose name I have purged from my bones. I spent seven hours drafting the preface, debating whether “My dear” carried the heavy, uninvited odor of a dying marriage. In the end, the ink spilled across the floor, a dark, starless puddle. I left it there. Let the floorboards read what I could not bring myself to say.`,
    tags: ["insomnia", "existential", "raw-human", "dostoevsky"],
    mood: "Stories",
    likesCount: 142,
    commentCount: 19,
    createdAt: {
      toDate: () => new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    }
  },
  {
    id: "dostoevsky_the_spider",
    authorId: "abhinav_the_scribe",
    authorName: "Abhinav",
    authorPhoto: "https://lh3.googleusercontent.com/a/default-user=s96-c",
    title: "The Svidrigailov Perspective",
    content: `We always imagine eternity as something incomprehensible, vast, a cosmic expanse. But what if, instead of all that grandeur, it is simply a small room? A little room, like a bathhouse in the country, black with soot, with spiders crawling in every corner, and that is all eternity is? 

When you click ‘read my writing’, you are looking for light. How foolish. We do not write to find light—we write to accustom our eyes to the dark room. We are all searching for a justification to exist just five minutes longer than our conscience permits. If you find no pieces here, know that the spiders have won, and the ink has run cold.

There is a terrifying dignity in suffering. If we are spared from pain, we are spared from the only mirror that does not distort our features. I look at my hand, stained with modern, chemical violet ink, and I realise it is the only part of me that is truly solid. Everything else is just a whisper in the wind.`,
    tags: ["suffering", "solitude", "philosophy", "classic"],
    mood: "Emotional",
    likesCount: 98,
    commentCount: 12,
    createdAt: {
      toDate: () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    }
  },
  {
    id: "dostoevsky_silent_confession",
    authorId: "abhinav_the_scribe",
    authorName: "Abhinav",
    authorPhoto: "https://lh3.googleusercontent.com/a/default-user=s96-c",
    title: "The Anatomy of a Quiet Room",
    content: `Silence is not empty; it is merely crowded with the things we didn't have the courage to say. 

I watch the wallpaper in the corner peel. If the plaster could write, it would produce a history more harrowing than any testament of war. It has witnessed the silent, dry-eyed sobbing of men who had everything but felt nothing. 

To love a person is to see them as God intended them to be, yet we are constantly confronted with what the world has made of them. We love the wreckage because we ourselves are built from ruins. This is the great comedic tragedy of our lives: we seek perfection with hands that can only reshape dust. 

Go on. Read the writings. Click the heart. Whisper your own torment into the editor. We are all passengers on the same ghost ship, arguing about who gets to hold the broken compass.`,
    tags: ["quiet-room", "ruins", "psychology", "honesty"],
    mood: "Poetry",
    likesCount: 167,
    commentCount: 23,
    createdAt: {
      toDate: () => new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    }
  }
];
