import React, { useEffect, useState } from 'react';
import { useDebounce } from './hooks/useDebounse'; 
import Search from './components/Search';
import Spinner from './components/Spinner';
import MovieCard from './components/MovieCard';
import { databases, DATABASE_ID, COLLECTION_ID, ID, Query } from './services/appwriteConfig';

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topSearched, setTopSearched] = useState([]);
  const debouncedSearch = useDebounce(searchTerm, 600);

  // ✅ Save search term to Appwrite
  const saveSearchTerm = async (term, posterUrl = '') => {
    if (!term.trim()) return;
    try {
      const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.equal('term', term.toLowerCase()),
      ]);

      if (existing.documents.length > 0) {
        const doc = existing.documents[0];
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
          count: doc.count + 1,
          poster_url: posterUrl || doc.poster_url,
        });
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
          term: term.toLowerCase(),
          count: 1,
          poster_url: posterUrl,
        });
      }
    } catch (err) {
      console.error('Error saving search term:', err);
    }
  };

  // ✅ Fetch top searched terms
  const fetchTopSearched = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.orderDesc('count'),
        Query.limit(5),
      ]);
      setTopSearched(res.documents);
    } catch (err) {
      console.error('Error fetching top searched:', err);
    }
  };

  // ✅ Fetch movies from TMDB
 const fetchMovies = async (query = '') => {
  try {
    setIsLoading(true);
    setErrorMessage('');
    const endpoint = query
      ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/discover/movie`;

    const response = await fetch(endpoint, API_OPTIONS);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    setMovieList(data.results || []);

    // ✅ Save only if TMDB actually returned a movie
    if (query && data.results && data.results.length > 0) {
      // Pick the first (most relevant) movie
      const bestMatch = data.results[0];

      const posterUrl = bestMatch.poster_path
        ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}`
        : '';

      // ✅ Save the actual movie title, not what the user typed
      await saveSearchTerm(bestMatch.title, posterUrl);

      // Refresh trending list
      fetchTopSearched();
    }

  } catch (error) {
    console.error('Error fetching movies:', error);
    setErrorMessage('Error fetching movies. Please try again later.');
  } finally {
    setIsLoading(false);
  }
};


  // 🔹 Fetch movies on search term change
  useEffect(() => {
    fetchMovies(debouncedSearch);
  }, [debouncedSearch]);

  // 🔹 Fetch top searched initially
  useEffect(() => {
    fetchTopSearched();
  }, []);

  return (
    <main>
      <div className="pattern"></div>
      <div className="wrapper">
        <header>
          <img src="./hero-img.png" alt="Hero Banner" />
          <h1>
            Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle
          </h1>
        </header>

        <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        {topSearched.length > 0 && (
          <section className="most-searched mt-8">
            <h2>🔥 Trending</h2>
            <div className="flex flex-wrap gap-4">
              {topSearched.map((item) => (
                <div
                  key={item.$id}
                  className="cursor-pointer w-[150px]"
                  onClick={() => setSearchTerm(item.term)}
                >
                  <img
                    src={
                      item.poster_url
                        ? item.poster_url
                        : 'https://via.placeholder.com/500x750?text=No+Image'
                    }
                    alt={item.term}
                    className="rounded-lg shadow-md hover:scale-105 transition w-full object-cover"
                  />
                  <p className="text-white text-center mt-2 text-sm">
                    {item.term} ({item.count})
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="all-movies">
          <h2 className="mt-[20px]">All Movies</h2>
          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul className="text-white">
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
