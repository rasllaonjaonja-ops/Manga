import test from "node:test";
import assert from "node:assert/strict";
import { clean, dedupe, parseFeed, clusterSimilar, isRelevantNews } from "../scripts/collect-rss.mjs";

test("clean removes markup and decodes common entities", () => {
  assert.equal(clean("<p>Un <b>manga</b> &amp; un anime</p>"), "Un manga & un anime");
});

test("clean removes script content and encoded HTML tags", () => {
  assert.equal(clean("<script>alert(1)</script>Texte &lt;b&gt;important&lt;/b&gt;"), "Texte important");
});

test("parseFeed extracts RSS article fields and rejects unsafe links", () => {
  const xml = `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title><![CDATA[Nouvelle saison anime]]></title>
        <link>https://example.com/news/1</link>
        <guid>news-1</guid>
        <pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate>
        <description><![CDATA[Une <b>annonce</b> importante.]]></description>
      </item>
      <item><title>Lien invalide</title><link>javascript:alert(1)</link></item>
    </channel></rss>`;
  const items = parseFeed(xml, { name: "Source test" });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Nouvelle saison anime");
  assert.equal(items[0].url, "https://example.com/news/1");
  assert.equal(items[0].source, "Source test");
  assert.equal(items[0].summary, "Une annonce importante.");
  assert.equal(items[0].id.length, 40);
});

test("parseFeed supports Atom link href attributes", () => {
  const xml = `<feed><entry>
    <title>Annonce manga</title>
    <id>tag:example.com,2026:2</id>
    <link href="https://example.com/atom/2" rel="alternate"/>
    <updated>2026-11-04T08:30:00Z</updated>
    <summary>Résumé Atom</summary>
  </entry></feed>`;
  const items = parseFeed(xml, { name: "Atom test" });
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://example.com/atom/2");
  assert.equal(items[0].summary, "Résumé Atom");
  assert.equal(items[0].publishedAt, "2026-11-04T08:30:00.000Z");
});

test("dedupe removes repeated URLs and normalized titles", () => {
  const items = [
    { title: "Nouvelle saison", url: "https://example.com/a#top" },
    { title: "Autre article", url: "https://example.com/a" },
    { title: "NOUVELLE   SAISON", url: "https://example.com/b" },
    { title: "Article unique", url: "https://example.com/c" }
  ];
  const result = dedupe(items);
  assert.deepEqual(result.map(item => item.url), [
    "https://example.com/a#top",
    "https://example.com/c"
  ]);
});

test("dedupe keeps distinct titles and URLs", () => {
  const items = [
    { title: "Anime 1", url: "https://example.com/1" },
    { title: "Anime 2", url: "https://example.com/2" }
  ];
  assert.equal(dedupe(items).length, 2);
});

test("clusterSimilar merges near-identical stories and counts independent sources", () => {
  const items = [
    { title: "'Mashle' Gets Live-Action Movie Adaptation", source: "MyAnimeList", url: "https://example.com/mal", score: 12, publishedAt: "2026-11-04T08:00:00.000Z" },
    { title: "Mashle Live-Action Movie Adaptation Announced", source: "Anime News Network", url: "https://example.com/ann", score: 11, publishedAt: "2026-11-04T09:00:00.000Z" },
    { title: "A Different Anime Announces New Season", source: "Anime Corner", url: "https://example.com/other", score: 10, publishedAt: "2026-11-04T10:00:00.000Z" }
  ];
  const result = clusterSimilar(items);
  const mashle = result.find(item => item.trendSources?.includes("MyAnimeList"));
  assert.ok(mashle);
  assert.equal(mashle.trendSourceCount, 2);
  assert.ok(mashle.trendScore > mashle.score);
  assert.equal(result.length, 2);
});

test("clusterSimilar regroupe les variantes de titres Mashle mais sépare une annonce de casting", () => {
  const items = [
    { title: "'Mashle' Gets Live-Action Movie Adaptation", summary: "Hajime Koumoto Mashle Magic and Muscles manga live-action movie adaptation announced", source: "MyAnimeList", url: "https://example.com/mal", score: 12, publishedAt: "2026-11-04T08:00:00.000Z" },
    { title: "Mashle: Magic and Muscles Live-Action Film Adaptation Announced", summary: "Japanese theatrical premiere March 19 2027", source: "Anime Corner", url: "https://example.com/ac", score: 14, publishedAt: "2026-11-04T09:00:00.000Z" },
    { title: "Mashle: Magic and Muscles Manga Gets Live-Action Film on March 19", summary: "Warner Brothers Fuji TV Credeus collaborate on project", source: "Anime News Network", url: "https://example.com/ann", score: 13, publishedAt: "2026-11-04T10:00:00.000Z" },
    { title: "Mashle Live-Action Film Reveals Cast and Director", summary: "Mackenyu stars as Mash Burnedead", source: "Anime News Network", url: "https://example.com/cast", score: 15, publishedAt: "2026-11-04T11:00:00.000Z" }
  ];
  const result = clusterSimilar(items);
  const announcement = result.find(x => x.trendSources.includes("MyAnimeList"));
  assert.ok(announcement);
  assert.equal(announcement.trendSourceCount, 3);
  assert.equal(announcement.trendArticles.length, 3);
  assert.ok(result.some(x => x.title.includes("Reveals Cast")));
});

test("clusterSimilar utilise aussi le résumé pour reconnaître un titre traduit", () => {
  const result = clusterSimilar([
    { title: "Manga Oshi ni Amagami Receives TV Anime Adaptation", summary: "Oshi ni Amagami Otaku Vampire Love Bite by Julietta Suzuki", source: "MyAnimeList", url: "https://example.com/oshi", score: 10 },
    { title: "Otaku Vampire Love Bite Manga Gets TV Anime", summary: "Bloody romantic comedy from Kamisama Kiss creator Julietta Suzuki", source: "Anime News Network", url: "https://example.com/vampire", score: 11 }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].trendSourceCount, 2);
});

test("isRelevantNews filtre les résultats Google Actualités hors sujet", () => {
  assert.equal(isRelevantNews({ source: "Google Actualités", title: "Parassy : un défilé de petits monstres anime les rues à la recherche de bonbons" }), false);
  assert.equal(isRelevantNews({ source: "Google Actualités", title: "-24% sur cette figurine One Piece Bandai Anime Heroes" }), false);
  assert.equal(isRelevantNews({ source: "Google Actualités", title: "Anime - Chitose Is in the Ramune Bottle - Episode 17" }), true);
  assert.equal(isRelevantNews({ source: "Crunchyroll (Google Actualités)", title: "Une actualité sans rapport sur Halloween et les figurines" }), false);
  assert.equal(isRelevantNews({ source: "Anime News Network", title: "Figurine hors sujet" }), true);
});