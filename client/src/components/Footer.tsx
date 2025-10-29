import React from 'react';
import { Linkedin, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-text">
          <p className="footer-name">Vijay Bontha</p>
          <div className="footer-links">
            <a 
              href="https://linkedin.com/in/bonthavijay" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
              aria-label="LinkedIn Profile"
            >
              <Linkedin size={18} />
              <span>LinkedIn</span>
            </a>
            <a 
              href="https://vijaybontha.netlify.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
              aria-label="Portfolio Website"
            >
              <ExternalLink size={18} />
              <span>Portfolio</span>
            </a>
          </div>
        </div>
        <p className="footer-copyright">
          © {new Date().getFullYear()} All rights reserved
        </p>
      </div>
    </footer>
  );
};

