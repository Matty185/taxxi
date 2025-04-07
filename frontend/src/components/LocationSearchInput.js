import React, { useState } from 'react';
import axios from 'axios';
import { MapPin } from 'lucide-react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWF0dHl0dWQiLCJhIjoiY205MzFxdXJ4MGFmNTJrcjBjNjR1em5ubyJ9.x5Xg1-FVPgJV0w3clJ2NXg';

const LocationSearchInput = ({ placeholder, onSelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (!value) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          value
        )}.json?access_token=${MAPBOX_TOKEN}&country=ie&bbox=-10.76,51.35,-5.99,55.45&types=place,address,poi`
      );

      setSuggestions(response.data.features || []);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.place_name);
    setSuggestions([]);
    onSelect(suggestion.place_name, suggestion.center);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <p className="text-sm font-medium text-gray-900">{suggestion.place_name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSearchInput; 