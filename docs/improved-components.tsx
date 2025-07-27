// Improved Component Examples with Green Brand Design
import React, { useState } from 'react';
import { ChefHat, MapPin, Clock, DollarSign, Send, CheckCircle, AlertCircle } from 'lucide-react';

// 1. IMPROVED LANDING PAGE COMPONENT
export function ImprovedLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-fresh-50">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        
        {/* Header with improved spacing */}
        <header className="text-center mb-16 lg:mb-20">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-brand-100 p-3 rounded-2xl mr-4 shadow-sm">
              <ChefHat className="h-10 w-10 lg:h-12 lg:w-12 text-brand-600" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-text-primary">ChefsCart</h1>
          </div>
          <p className="text-xl lg:text-2xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Fresh, healthy meal planning powered by AI. From preferences to cart in under 5 minutes.
          </p>
        </header>

        {/* Enhanced ZIP Code Section */}
        <div className="max-w-md mx-auto mb-16 lg:mb-20">
          <ImprovedZipCodeInput />
        </div>

        {/* How It Works - Improved Grid */}
        <section className="mb-16 lg:mb-20">
          <h2 className="text-3xl lg:text-4xl font-bold text-center text-text-primary mb-12 lg:mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-brand-100 to-brand-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-green transition-all duration-300">
                <span className="text-2xl font-bold text-brand-700">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-text-primary">Share Your Preferences</h3>
              <p className="text-text-secondary leading-relaxed">
                Chat with our AI assistant about your dietary needs, cooking skills, and meal preferences.
              </p>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-fresh-100 to-fresh-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-green transition-all duration-300">
                <span className="text-2xl font-bold text-fresh-700">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-text-primary">Get Fresh Recipes</h3>
              <p className="text-text-secondary leading-relaxed">
                Receive a personalized meal plan with recipes tailored to your tastes and schedule.
              </p>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-mint-100 to-mint-200 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md group-hover:shadow-green transition-all duration-300">
                <span className="text-2xl font-bold text-mint-700">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-text-primary">Shop with One Click</h3>
              <p className="text-text-secondary leading-relaxed">
                Review your cart and checkout through Instacart with all ingredients ready to order.
              </p>
            </div>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section className="bg-white rounded-3xl p-8 lg:p-12 shadow-lg max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-12">
            Why Choose ChefsCart?
          </h2>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {[
              {
                icon: Clock,
                title: "Save Time",
                description: "From meal planning to shopping cart in under 5 minutes",
                color: "brand"
              },
              {
                icon: DollarSign,
                title: "Smart Budgeting",
                description: "Get cost estimates and optimize for your budget preferences",
                color: "fresh"
              },
              {
                icon: ChefHat,
                title: "Personalized",
                description: "Recipes adapted to your dietary needs and cooking skill level",
                color: "mint"
              },
              {
                icon: MapPin,
                title: "Local Availability",
                description: "Ingredients matched to your local Instacart stores",
                color: "brand"
              }
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-4 group">
                <div className={`bg-${feature.color}-100 rounded-2xl p-4 flex-shrink-0 shadow-sm group-hover:shadow-md transition-all duration-300`}>
                  <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                </div>
                <div>
                  <h3 className="font-semibold mb-3 text-lg text-text-primary">{feature.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// 2. IMPROVED ZIP CODE INPUT COMPONENT
export function ImprovedZipCodeInput() {
  const [zipCode, setZipCode] = useState('');
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid' | 'loading'>('idle');
  const [message, setMessage] = useState('');

  const getInputStyles = () => {
    const baseStyles = "w-full pl-14 pr-14 py-4 text-lg font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4";
    
    switch (validationState) {
      case 'valid':
        return `${baseStyles} border-2 border-mint-500 focus:border-mint-600 focus:ring-mint-100 bg-mint-50`;
      case 'invalid':
        return `${baseStyles} border-2 border-error focus:border-error focus:ring-red-100 bg-red-50`;
      case 'loading':
        return `${baseStyles} border-2 border-brand-300 focus:border-brand-500 focus:ring-brand-100`;
      default:
        return `${baseStyles} border-2 border-neutral-200 focus:border-brand-500 focus:ring-brand-100`;
    }
  };

  return (
    <div className="w-full space-y-4">
      <label htmlFor="zipCode" className="block text-base font-semibold text-text-primary mb-3">
        Enter your ZIP code to get started
      </label>
      
      <div className="relative">
        <input
          id="zipCode"
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="12345"
          className={getInputStyles()}
          maxLength={5}
          aria-describedby="zip-help zip-validation"
        />
        
        {/* Left Icon */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <MapPin className="h-6 w-6 text-neutral-400" />
        </div>
        
        {/* Right Icon/Loading */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {validationState === 'loading' && (
            <div className="h-6 w-6 border-2 border-neutral-300 border-t-brand-600 rounded-full animate-spin" />
          )}
          {validationState === 'valid' && (
            <CheckCircle className="h-6 w-6 text-mint-500" />
          )}
          {validationState === 'invalid' && (
            <AlertCircle className="h-6 w-6 text-error" />
          )}
        </div>
      </div>

      {/* Validation Message */}
      {message && (
        <div className={`flex items-start p-4 rounded-xl ${
          validationState === 'valid' 
            ? 'bg-mint-50 border border-mint-200 text-mint-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {validationState === 'valid' && <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />}
          {validationState === 'invalid' && <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />}
          <span className="text-sm leading-relaxed">{message}</span>
        </div>
      )}

      {/* CTA Button */}
      {validationState === 'valid' && (
        <button className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-brand-700 hover:to-brand-800 transition-all duration-200 shadow-green hover:shadow-green-lg transform hover:-translate-y-0.5 flex items-center justify-center">
          Get Started
          <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// 3. AI CHATBOT INTERFACE COMPONENT
export function AIChatbotInterface() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'ai' as const,
      content: "Hi! I'm your personal chef assistant 🌱 I'm here to create the perfect meal plan based on your preferences. Let's start with the basics - what types of meals are you looking to plan for this week?",
      quickReplies: ["Weekday dinners", "All meals", "Just breakfast", "Meal prep", "Family meals"]
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6">
        <div className="flex items-center">
          <div className="bg-white/20 rounded-2xl p-3 mr-4">
            <ChefHat className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ChefsCart Assistant</h1>
            <p className="text-brand-100 text-sm">Powered by AI • Always learning</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-sm px-6 py-4 rounded-2xl shadow-sm ${
              message.role === 'user' 
                ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-br-md' 
                : 'bg-gradient-to-br from-brand-50 to-brand-100 text-text-primary border border-brand-200 rounded-bl-md'
            }`}>
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Quick Reply Buttons */}
        {messages[messages.length - 1]?.quickReplies && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">Quick replies:</p>
            <div className="flex flex-wrap gap-2">
              {messages[messages.length - 1].quickReplies.map((reply, index) => (
                <button
                  key={index}
                  className="px-4 py-2 bg-white border-2 border-brand-200 text-brand-700 rounded-full text-sm font-medium hover:bg-brand-50 hover:border-brand-300 transition-all duration-200 hover:scale-105"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-brand-50 border border-brand-200 px-6 py-4 rounded-2xl rounded-bl-md">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce-gentle"></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce-gentle" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce-gentle" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-neutral-200 p-6 bg-neutral-50">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 border-2 border-neutral-200 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition-all duration-200"
            />
            <button
              disabled={!inputValue.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3 text-center">
          Press Enter to send • AI responses are generated, please verify important information
        </p>
      </div>
    </div>
  );
}

// 4. ENHANCED MEAL PLAN CARD COMPONENT
export function EnhancedMealPlanCard({ recipe }: { recipe: any }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-text-primary mb-3 group-hover:text-brand-700 transition-colors">
              {recipe.title}
            </h3>
            <p className="text-text-secondary mb-4 text-lg leading-relaxed">
              {recipe.description}
            </p>
            
            {/* Enhanced Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <span className="flex items-center text-text-muted">
                <div className="w-6 h-6 bg-mint-100 rounded-lg flex items-center justify-center mr-2">
                  <Clock className="h-3 w-3 text-mint-600" />
                </div>
                {recipe.prepTime + recipe.cookTime}min
              </span>
              <span className="flex items-center text-text-muted">
                <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center mr-2">
                  <svg className="h-3 w-3 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                {recipe.servings} servings
              </span>
              <span className="flex items-center text-text-muted">
                <div className="w-6 h-6 bg-fresh-100 rounded-lg flex items-center justify-center mr-2">
                  <DollarSign className="h-3 w-3 text-fresh-600" />
                </div>
                ${recipe.estimatedCost?.toFixed(2)}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                {recipe.difficulty}
              </span>
              <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-medium">
                {recipe.cuisine}
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 ml-6">
            <button className="px-4 py-2 text-sm font-medium bg-brand-100 text-brand-700 rounded-xl hover:bg-brand-200 transition-all duration-200 hover:scale-105">
              Swap Recipe
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-all duration-200">
              Remove
            </button>
          </div>
        </div>

        {/* Nutrition Grid - Enhanced */}
        {recipe.nutrition && (
          <div className="grid grid-cols-4 gap-4 p-6 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-2xl border border-neutral-200">
            {[
              { label: 'Calories', value: `${recipe.nutrition.calories - 20}-${recipe.nutrition.calories + 30}`, color: 'text-orange-600' },
              { label: 'Protein', value: `${recipe.nutrition.protein}g+`, color: 'text-brand-600' },
              { label: 'Carbs', value: `${recipe.nutrition.carbs}g+`, color: 'text-fresh-600' },
              { label: 'Fat', value: `${recipe.nutrition.fat}g+`, color: 'text-mint-600' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                  {stat.label}
                </p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Ingredients Preview - Enhanced */}
        <div className="mt-6">
          <h4 className="font-semibold text-text-primary mb-4 text-lg">Key Ingredients:</h4>
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients?.slice(0, 6).map((ingredient: any, idx: number) => (
              <span
                key={idx}
                className="px-3 py-2 bg-fresh-100 text-fresh-800 text-sm rounded-xl font-medium border border-fresh-200 hover:bg-fresh-200 transition-colors"
              >
                {ingredient.name}
              </span>
            ))}
            {recipe.ingredients && recipe.ingredients.length > 6 && (
              <span className="px-3 py-2 bg-neutral-100 text-neutral-600 text-sm rounded-xl font-medium border border-neutral-200">
                +{recipe.ingredients.length - 6} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}