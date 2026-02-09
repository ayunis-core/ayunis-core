Content Retrieval
Extract content from files, URLs, and internet search results

Retrievers fetch and extract text content from external sources: parsing uploaded files (PDF, documents), scraping web URLs, and performing internet searches via Brave Search for real-time information.

The retrievers module is organized into three sub-modules: **file-retrievers**, **url-retrievers**, and **internet-search-retrievers**. File retrievers extract text from uploaded documents using pluggable handlers (Mistral, pdf-parse, Docling). URL retrievers scrape and parse web page content using Cheerio. Internet search retrievers query Brave Search API for web results. Each sub-module follows the port/adapter pattern with handler registries for extensibility. Key entities include `FileRetrieverResult`, `UrlRetrieverResult`, and `InternetSearchResult`. The module integrates with **sources** for providing raw content from uploaded files and URLs, **rag** as the downstream consumer that indexes extracted content into vector stores, and **tools** where the internet_search and website_content tool handlers invoke retrievers during conversation execution.
