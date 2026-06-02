let allHistory = [];
let bannedUrls = new Set(JSON.parse(localStorage.getItem("bannedAutocomplete") || "[]"));

export const setHistory = (history) => {
  allHistory = history || [];
};

export const banUrl = (url) => {
  bannedUrls.add(url);
  localStorage.setItem("bannedAutocomplete", JSON.stringify(Array.from(bannedUrls)));
};

export const isbanned = (url) => {
  return bannedUrls.has(url);
};

const getMatchableUrl = (url) => {
  if (!url) return "";
  return url.replace(/^(https?:\/\/)?(www\.)?/i, "").toLowerCase();
};


const getRankedHistory = () => {
  const urlMap = new Map();

  for (const item of allHistory) {
    if (!item.url) continue;

    const matchable = getMatchableUrl(item.url);
    if (!matchable) continue;

    if (urlMap.has(item.url)) {
      const existing = urlMap.get(item.url);
      existing.count += 1;
      if (item.visitedAt > existing.visitedAt) {
        existing.title = item.title || existing.title;
        existing.visitedAt = item.visitedAt;
        existing.iconURL = item.iconURL || existing.iconURL;
      }
    } 
    else {
      urlMap.set(item.url, {
        url: item.url,
        matchable: matchable,
        title: item.title || item.url,
        iconURL: item.iconURL || "",
        visitedAt: item.visitedAt,
        count: 1
      });
    }
  }

  return Array.from(urlMap.values());
};

export const getSuggestions = (query) => {
  const queryClean = query.trim().toLowerCase();
  if (!queryClean) return [];

  const ranked = getRankedHistory();
  
  // banned as in some results in the autocomplete can be banned as in you shouldnt see them but still can in case
  const nonbannedStartsWith = [];
  const bannedStartsWith = [];
  const nonbannedContains = [];
  const bannedContains = [];

  for (const item of ranked) {
    if (item.url.startsWith("about:")) continue;

    const matchable = item.matchable;
    const title = item.title.toLowerCase();
    const isItembanned = bannedUrls.has(item.url);

    if (matchable.startsWith(queryClean)) {
      if (isItembanned) {
        bannedStartsWith.push(item);
      } 
      
      else {
        nonbannedStartsWith.push(item);
      }

    } 
    
    else if (matchable.includes(queryClean) || title.includes(queryClean)) {
      if (isItembanned) {
        bannedContains.push(item);
      } 
      
      else {
        nonbannedContains.push(item);
      }
    }
  }

  const sortByScore = (a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return b.visitedAt - a.visitedAt;
  };

  nonbannedStartsWith.sort(sortByScore);
  nonbannedContains.sort(sortByScore);
  bannedStartsWith.sort(sortByScore);
  bannedContains.sort(sortByScore);

  let suggestionItems = [
    ...nonbannedStartsWith,
    ...nonbannedContains,
    ...bannedStartsWith,
    ...bannedContains
  ];


  if (suggestionItems.length > 0 && bannedUrls.has(suggestionItems[0].url)) {
    const searchUrl = "https://www.google.com/search?q=" + encodeURIComponent(query.trim());
    const searchItem = {
      url: searchUrl,
      isSearch: true,
      matchable: query.trim(),
      title: `Search Google for "${query.trim()}"`,
      iconURL: "",
      visitedAt: Date.now(),
      count: 0
    };


    suggestionItems = [searchItem, ...suggestionItems];
  }

  return suggestionItems.slice(0, 10);
};

export const shortenAddress = (address) => {

  if (!address) return "";
  const queryIndex = address.indexOf("?");
  return queryIndex === -1 ? address : address.substring(0, queryIndex);
};
