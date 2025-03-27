# Warpcaster change name

I found it weird that there is no clear path on how to change username on farcaster,
so I made this small script, the details can be found at [DETAILS.md](DETAILS.md)

FYI: I did not test this script, so if it throws an error open an issue or check details.md for more troubleshooting.

## Usage

I use bun to run the script, but you can use any other package manager (I'm not sure if it will work with other package managers though).

# Installation

// Optional
## Install bun

```bash
curl -fsSL https://bun.sh/install | bash
```

## Install dependencies

```bash
bun install
```

## Create .env file from .env.sample and fill it with your own values

```bash
cp .env.sample .env
```

## Run the script

```bash
bun run index.ts
```

