import React, { useState } from 'react';
import axios from 'axios';

const ProfileForm = ({ profile, setProfile }) => {
  const [formData, setFormData] = useState({ username: profile.username, email: profile.email });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/profile', formData, {
        headers: { Authorization: token },
      });
      setProfile(response.data);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" value={formData.username} onChange={handleChange} />
      <input type="email" name="email" value={formData.email} onChange={handleChange} />
      <button type="submit">Update Profile</button>
    </form>
  );
};

export default ProfileForm;
