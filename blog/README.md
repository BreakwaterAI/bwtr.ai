# Publishing a blog post

1. Add `blog/posts/<slug>.md` with a title, date, excerpt, and Markdown body. Copy an existing post for the frontmatter format.
2. Preview the Markdown in your editor.
3. Run `npm run publish-blog` from the repository root.

The command renders the blog with the current site theme, checks the built files,
commits only blog-related changes, and pushes `main`. GitHub Actions deploys that
commit to `www.bwtr.ai` using its configured AWS role. No local AWS credentials or
per-post release manifest edit is needed.

Run `npm run publish-blog -- --dry-run` to build and check without committing or
pushing. Generated HTML and RSS files are local build output; the Markdown is the
source of each post.
