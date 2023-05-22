# Contributing

Check out ways to contribute to storybook-builder-wds:

## Feature requests

When you have an idea on how we could improve, please check our [discussions](https://github.com/bashmish/storybook-builder-wds/issues) to see if there are similar ideas or feature requests. If there are none, please [start](https://github.com/bashmish/storybook-builder-wds/discussions/new) your feature request as a new discussion topic. Add the title `[Feature Request] My awesome feature` and a description of what you expect from the improvement and what the use case is.

## Existing components: we love pull requests ♥

Help out by sending your merge requests and issues.
Check out how to set it up:

Setup:

```bash
# Clone the repo:
git clone https://github.com/bashmish/storybook-builder-wds
cd storybook-builder-wds

# Install dependencies
npm install

# Create a branch for your changes
git checkout -b fix/contribution
```

Make sure everything works as expected:

```bash
# Linting
npm run lint

# Build
npm run build

# Tests
npm run test
```

Create a Pull Request:

- At <https://github.com/bashmish/storybook-builder-wds> click on fork (at the right top)

```bash
# add fork to your remotes
git remote add fork git@github.com:<your-user>/storybook-builder-wds.git

# push new branch to your fork
git push -u fork fix/contribution
```

- Go to your fork and create a Pull Request :).

Some things that will increase the chance that your merge request is accepted:

- Write tests.
- Add documentation.
- Write a [good commit message](https://www.conventionalcommits.org/).
