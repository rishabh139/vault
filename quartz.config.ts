import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Rishabh's Protocol",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "rishabht.vercel.app",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "JetBrains Mono",
        body: "IBM Plex Mono",
        code: "Fira Code",
      },
      colors: {
        lightMode: {
          light: "#ffffff",
          lightgray: "#e0e0e0",
          gray: "#b8b8b8",
          darkgray: "#1a1a1a",
          dark: "#1a1a1a",
          secondary: "#dc2626",
          tertiary: "#f59e0b",
          highlight: "rgba(220, 38, 38, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#1e1e1e",
          lightgray: "#363636",
          gray: "#666666",
          darkgray: "#cccccc",
          dark: "#cccccc",
          secondary: "#ef4444",
          tertiary: "#fbbf24",
          highlight: "rgba(239, 68, 68, 0.15)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage({
        sort: (f1, f2) => {
          // Custom sort that handles numeric prefixes properly
          const title1 = f1.frontmatter?.title ?? ""
          const title2 = f2.frontmatter?.title ?? ""
          
          // Extract numeric prefixes (e.g., "1", "2.1", "2.2")
          const getNumericPrefix = (str: string) => {
            const match = str.match(/^(?:Phase\s+)?([0-9.]+)/)
            return match ? match[1] : null
          }
          
          const prefix1 = getNumericPrefix(title1)
          const prefix2 = getNumericPrefix(title2)
          
          // If both have numeric prefixes, compare them properly
          if (prefix1 && prefix2) {
            const parts1 = prefix1.split('.').map(Number)
            const parts2 = prefix2.split('.').map(Number)
            
            for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
              const num1 = parts1[i] || 0
              const num2 = parts2[i] || 0
              if (num1 !== num2) return num1 - num2
            }
          }
          
          // Fall back to alphabetical comparison
          return title1.localeCompare(title2, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        }
      }),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
