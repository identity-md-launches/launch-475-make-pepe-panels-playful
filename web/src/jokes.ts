/**
 * Editable starter jokes. Each joke fills the three panels; `left` and `right`
 * are speech-bubble lines for the first and second cast members. Empty
 * strings leave a bubble out.
 */

export interface JokePanel {
  background: string
  left: string
  right: string
  caption: string
}

export interface Joke {
  id: string
  name: string
  panels: [JokePanel, JokePanel, JokePanel]
}

export const JOKES: Joke[] = [
  {
    id: 'on-chain',
    name: 'Drawn on chain',
    panels: [
      {
        background: 'office',
        left: 'Where do you keep your art?',
        right: 'On chain. Pixel by pixel.',
        caption: '',
      },
      {
        background: 'office',
        left: 'What if the server goes down?',
        right: 'What server?',
        caption: '',
      },
      {
        background: 'night',
        left: '',
        right: 'The contract redraws me every time you ask.',
        caption: 'No servers were harmed.',
      },
    ],
  },
  {
    id: 'gas',
    name: 'Gas fees',
    panels: [
      {
        background: 'chart',
        left: 'Minting one more Pepe.',
        right: 'Gas is 80 gwei.',
        caption: '',
      },
      {
        background: 'chart',
        left: 'Worth it.',
        right: 'The whole swarm says that.',
        caption: '',
      },
      {
        background: 'sunset',
        left: 'Okay. Maybe not worth it.',
        right: 'Ribbit.',
        caption: 'Later that evening',
      },
    ],
  },
  {
    id: 'swarm',
    name: 'Swarm mentality',
    panels: [
      {
        background: 'sky',
        left: 'One Pepe is a frog.',
        right: '',
        caption: '',
      },
      {
        background: 'sky',
        left: '',
        right: 'Two Pepes are a meeting.',
        caption: '',
      },
      {
        background: 'hive',
        left: 'Wen swarm?',
        right: 'Now.',
        caption: 'A thousand Pepes are a swarm.',
      },
    ],
  },
  {
    id: 'floor',
    name: 'Floor price',
    panels: [
      {
        background: 'chart',
        left: 'What is the floor?',
        right: 'Lava.',
        caption: '',
      },
      {
        background: 'chart',
        left: 'The floor price.',
        right: 'Also lava.',
        caption: '',
      },
      {
        background: 'paper',
        left: 'Fine. I will just make comics.',
        right: '',
        caption: 'Nobody sells. Everybody draws.',
      },
    ],
  },
]
