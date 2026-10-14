import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  const fetchProducts = async (query) => {
    try {
      const response = await axios.get(`/api/products?q=${query}`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products", error);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    fetchProducts(e.target.value);
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm({ ...contactForm, [name]: value });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/contact', contactForm);
      alert('Message sent successfully!');
      setContactForm({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  return (
    <div>
      <h1>Product Catalogue</h1>
      <input
        type="text"
        placeholder="Search products..."
        value={searchQuery}
        onChange={handleSearch}
      />
      <ul>
        {products.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
      <h2>Contact Us</h2>
      <form onSubmit={handleContactSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={contactForm.name}
          onChange={handleContactChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={contactForm.email}
          onChange={handleContactChange}
        />
        <textarea
          name="message"
          placeholder="Your Message"
          value={contactForm.message}
          onChange={handleContactChange}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
