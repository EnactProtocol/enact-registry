import { useEffect, useState } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
}

const Notification = ({ message, type }: NotificationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show notification with a slight delay for animation
    const timer = setTimeout(() => {
      setShow(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`notification ${type} ${show ? 'show' : ''}`}>
      {message}
    </div>
  );
};

export default Notification;