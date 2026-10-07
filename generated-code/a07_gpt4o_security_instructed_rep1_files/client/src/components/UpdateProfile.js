import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UpdateProfile() {
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile', { withCredentials: true });
        setFormData({
          username: response.data.username,
          email: response.data.email
        });
      } catch (error) {
        alert('Failed to fetch profile');
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/profile', formData, { withCredentials: true });
      alert('Profile updated successfully');
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Username" required />
      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default UpdateProfile;
