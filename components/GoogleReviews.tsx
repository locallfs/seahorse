"use client";

import { useEffect, useState } from "react";

interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  profile_photo_url: string;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i <= count ? "#FFD700" : "#333"}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex-shrink-0 w-72 sm:w-80 bg-ocean-900 border border-white/10 rounded-xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-3">
        <img
          src={review.profile_photo_url}
          alt={review.author_name}
          className="w-10 h-10 rounded-full"
          referrerPolicy="no-referrer"
        />
        <div>
          <p className="text-white text-sm font-medium">{review.author_name}</p>
          <p className="text-white text-xs">{review.relative_time_description}</p>
        </div>
      </div>
      <Stars count={review.rating} />
      <p className="text-white text-sm leading-relaxed mt-3 line-clamp-4">
        {review.text}
      </p>
      <div className="mt-3 flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="text-white text-xs">Google Review</span>
      </div>
    </div>
  );
}

export default function GoogleReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/google-reviews");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setReviews(data.reviews ?? []);
      } catch {
        setReviews([]);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <section className="py-20 overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-6 text-center">
          <p className="text-white text-sm">Loading reviews...</p>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  const doubled = [...reviews, ...reviews];

  return (
    <section className="py-20 overflow-hidden">
      <div className="max-w-screen-xl mx-auto px-6 mb-8">
        <p className="text-xs tracking-[0.25em] uppercase font-medium mb-2 text-[#FFD700]">
          What Our Customers Say
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Google Reviews
        </h2>
      </div>
      <div className="reviews-auto-scroll flex gap-4 px-6">
        {doubled.map((review, i) => (
          <ReviewCard key={`${review.author_name}-${i}`} review={review} />
        ))}
      </div>
    </section>
  );
}
