import React from "react";
import Head from "next/head";
import BitcoinLogo from "@/components/BitcoinLogo";
import { config } from "@/config";

export default function Home() {
  console.log('🏠 Home page - config.images.hero:', config.site.images.hero);
  console.log('🏠 Home page - config.site.organization.name:', config.site.organization.name);
  
  return (
    <>
      <Head>
        <title>{config.pages.home.meta.title}</title>
        <meta
          name="description"
          content={config.pages.home.meta.description}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section - Using background image from config */}
      <section 
        className="relative bg-cover bg-center bg-no-repeat py-32"
        style={{
          backgroundImage: config.site.images.hero.startsWith('http') 
            ? `url(${config.site.images.hero})` 
            : `url(${config.site.images.hero})`,
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 container mx-auto px-6 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-black mb-6 font-archivo-black">
            {config.pages.home.hero.title}
          </h1>
        </div>
      </section>

      {/* Main Content Section - White Background */}
      <section className="bg-white text-black py-16">
        <div className="container mx-auto px-6 max-w-6xl ">

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Left Column - Bitcoin Logo */}
            <div className="flex justify-center">
              <BitcoinLogo size={350} className="shadow-lg" />
            </div>

            {/* Right Column - Content */}
            <div className="space-y-6 text-lg">
              <p className="leading-relaxed">
                {config.pages.home.hero.description}
              </p>

              <p className="leading-relaxed">
                {config.pages.home.hero.topics.intro}
              </p>

              <ul className="list-disc list-inside space-y-1 ml-4 text-gray-700 leading-relaxed">
                {config.pages.home.hero.topics.list.map((topic: string, index: number) => (
                  <li key={index}>{topic}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section - Orange Background */}
      <section className="bg-bitcoin-orange text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8 font-archivo-black">
            Ready to Join Community?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {config.pages.home.callToAction.buttons.map((button: any, index: number) => (
              <a
                key={index}
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                  button.style === 'primary'
                    ? 'bg-white bitcoin-orange hover:bg-gray-100'
                    : 'bg-transparent border-2 border-white text-white hover:bg-white hover:bitcoin-orange hover:text-gray-700'
                }`}
              >
                {button.text}
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
