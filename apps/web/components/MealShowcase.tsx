"use client"

import Image from 'next/image'

const mealImages = [
  { src: '/images/meals/meal-1.webp', alt: 'Mediterranean bowl with grilled chicken, quinoa, avocado, olives, feta, and vegetables' },
  { src: '/images/meals/meal-2.webp', alt: 'Breakfast omelet with spinach, mushrooms, served with roasted potatoes and avocado' },
  { src: '/images/meals/meal-3.webp', alt: 'Grilled steak with herb butter, roasted potatoes, and asparagus' },
  { src: '/images/meals/meal-4.webp', alt: 'Healthy grain bowl with grilled chicken, sweet potato, avocado, tomatoes, and greens' },
  { src: '/images/meals/meal-5.webp', alt: 'Herb-crusted salmon with asparagus and lemon' },
  { src: '/images/meals/meal-6.webp', alt: 'Blueberry pancakes with maple syrup and fresh blueberries' },
  { src: '/images/meals/meal-7.webp', alt: 'Korean-style bibimbap bowl with beef, vegetables, and fried egg' },
  { src: '/images/meals/meal-8.webp', alt: 'Gourmet meal with seasonal ingredients' },
]

export default function MealShowcase() {
  return (
    <section className="mb-16">
      <div className="max-w-6xl mx-auto mobile-container">
        <h2 className="text-display font-display font-bold text-center text-neutral-800 mb-8 lg:mb-12">
          Delicious Meals Made Simple
        </h2>
        <p className="text-center text-neutral-600 text-mobile-lg mb-8 lg:mb-12 max-w-2xl mx-auto leading-relaxed">
          From quick everyday meals to special occasion dishes, discover recipes that fit your lifestyle and taste preferences.
        </p>
        
        {/* Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {mealImages.map((meal, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-xl shadow-soft hover:shadow-brand-lg transition-all duration-300 ease-out hover:-translate-y-1"
            >
              <Image
                src={meal.src}
                alt={meal.alt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out" />
            </div>
          ))}
        </div>
        
        {/* Bottom CTA Text */}
        <div className="text-center mt-12">
          <p className="text-neutral-600 text-lg mb-4">
            Ready to discover your next favorite meal?
          </p>
          <button 
            onClick={() => {
              // Scroll to top of page where ZIP input is located
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-4 rounded-lg transition-colors duration-200 cursor-pointer touch-target text-mobile-base min-h-[56px] shadow-brand hover:shadow-brand-lg transform hover:-translate-y-0.5"
          >
            Start planning now!
          </button>
        </div>
      </div>
    </section>
  )
}