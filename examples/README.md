# Examples

Runnable Node.js scripts demonstrating `allerhande-client`.

## Setup

From the **repository root**, build the package and install the example dependencies:

```sh
npm run build
cd examples
npm install
```

## Scripts

### Search recipes

```sh
node search.js "pasta carbonara"
node search.js soep --size=5 --sort=POPULAR
node search.js cake --sort=NEWEST
```

### Fetch a full recipe

```sh
node get-recipe.js            # uses recipe 1202199 (pasta carbonara)
node get-recipe.js 1234567    # any recipe ID
```

### Stream all results

```sh
node search-all.js soep
node search-all.js pasta --limit=50
```

## Using the published version

`allerhande-client` is on npm. To use the published package instead of the local build, change the dependency in `package.json`:

```json
"allerhande-client": "^1.0.0"
```

Then run `npm install` — no `npm run build` step needed.
