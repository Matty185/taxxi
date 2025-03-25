import React from "react";

const Button = ({ children, variant = "default", onClick }) => {
  const styles = {
    default: "bg-blue-500 text-white px-4 py-2 rounded-md",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-md",
  };

  return (
    <button className={styles[variant]} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
