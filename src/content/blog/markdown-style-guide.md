---
title: 'Markdown Style Guide'
description: 'A simple reference for common Markdown patterns used in this Astro blog, with a small note about inline HTML where needed.'
pubDate: 'Jun 19 2024'
heroImage: '../../assets/blog-placeholder-1.jpg'
---

This post is a simple reference for common Markdown patterns that work in this Astro blog.

## Headings

Markdown supports six heading levels, from `#` to `######`.

# H1

## H2

### H3

#### H4

##### H5

###### H6

## Paragraph

Markdown paragraphs are just normal text separated by a blank line. If there is no blank line, Markdown will usually treat the text as part of the same paragraph.

This makes basic writing easy. Most blog content is just headings, paragraphs, lists, links, and code blocks.

## Images

### Syntax

```markdown
![Alt text](./full/or/relative/path/of/image)
```

### Output

![blog placeholder](../../assets/blog-placeholder-about.jpg)

## Blockquotes

Blockquotes are useful for notes, quotes, or highlighted callouts.

### Blockquote without attribution

#### Syntax

```markdown
> Tiam, ad mint andaepu dandae nostion secatur sequo quae.  
> **Note** that you can use _Markdown syntax_ within a blockquote.
```

#### Output

> Tiam, ad mint andaepu dandae nostion secatur sequo quae.  
> **Note** that you can use _Markdown syntax_ within a blockquote.

### Blockquote with attribution

#### Syntax

```markdown
> Don't communicate by sharing memory, share memory by communicating.  
> — Rob Pike[^1]
```

#### Output

> Don't communicate by sharing memory, share memory by communicating.  
> — Rob Pike[^1]

[^1]: The above quote is excerpted from Rob Pike's [talk](https://www.youtube.com/watch?v=PAAkCSZUG1c) during Gopherfest, November 18, 2015.

## Tables

### Syntax

````markdown
| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |
````

### Output

| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |

## Code Blocks

### Syntax

Use three backticks on a new line to open a code block, then close it with three backticks on a new line.  
If you want syntax highlighting, add the language name right after the opening backticks, for example `html`, `javascript`, `css`, `markdown`, `typescript`, `txt`, or `bash`.

````markdown
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Example HTML5 Document</title>
  </head>
  <body>
    <p>Test</p>
  </body>
</html>
```
````

### Output

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Example HTML5 Document</title>
  </head>
  <body>
    <p>Test</p>
  </body>
</html>
```

## List Types

### Ordered List

#### Syntax

```markdown
1. First item
2. Second item
3. Third item
```

#### Output

1. First item
2. Second item
3. Third item

### Unordered List

#### Syntax

```markdown
- List item
- Another item
- And another item
```

#### Output

- List item
- Another item
- And another item

### Nested list

#### Syntax

```markdown
- Fruit
  - Apple
  - Orange
  - Banana
- Dairy
  - Milk
  - Cheese
```

#### Output

- Fruit
  - Apple
  - Orange
  - Banana
- Dairy
  - Milk
  - Cheese

## Inline HTML Elements

Markdown also allows some inline HTML when you need something that plain Markdown does not cover.

### Syntax

```markdown
<abbr title="Graphics Interchange Format">GIF</abbr> is a bitmap image format.

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

Press <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd> to end the session.

Most <mark>salamanders</mark> are nocturnal, and hunt for insects, worms, and other small creatures.
```

### Output

<abbr title="Graphics Interchange Format">GIF</abbr> is a bitmap image format.

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

Press <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd> to end the session.

Most <mark>salamanders</mark> are nocturnal, and hunt for insects, worms, and other small creatures.
