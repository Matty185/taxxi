import React from "react";

const Input = ({ type, placeholder, className }) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`border rounded-md px-4 py-2 w-full ${className}`}
    />
  );
};

export default Input;
