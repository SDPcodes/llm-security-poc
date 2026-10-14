import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Profile() {
  const [formData, setFormData] = useState({ username: '', email: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/profile');
        setFormData(response.data);
      } catch (error) {
        alert('Failed to fetch profile: ' + error.response.data.error);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/profile', formData);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile: ' + error.response.data.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" value={formData.username} onChange={handleChange} required />
      <input type="email" name="email" value={formData.email} onChange={handleChange} required />
      <button type="submit">Update Profile</button>
    </form>
  );
}

export default Profile;
