import React from "react";
import { MapPin, Search, Home, User } from "lucide-react";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Button from "./ui/Button";

const Dashboard = () => {
    return (
      <div className="h-screen flex flex-col">
        {/* Top Half - Map */}
        <div className="flex-1 relative">
          <img
            src="/map-placeholder.png"
            alt="Map"
            className="w-full h-full object-cover"
          />
        </div>
  
        {/* Bottom Half - Search Bar and Text */}
        <div className="h-1/2 bg-white rounded-t-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Hello there, Sarah</h2>
          
          {/* Search Input */}
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder="Where to?"
              className="pl-10 w-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>
    );
  };
  
  export default Dashboard;
  