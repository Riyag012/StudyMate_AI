import React from 'react'
import CompanionCard from '@/components/CompanionCard';
import CompanionsList from '@/components/CompanionsList';
import CTA from '@/components/CTA';
import { recentSessions } from '@/constants';
import { getAllComapnions, getRecentSessions } from '@/lib/actions/companions.actions';
import { getSubjectColor } from '@/lib/utils';

const Page = async() => {

  const companions = await getAllComapnions({ limit: 3 });
  const recentSessionsCompanions = await getRecentSessions(10);

  return (
    <main>
      <h1>Popular Companions</h1>
      
      <section className = "home-section">
        {companions.map((companion) => (
           <CompanionCard 
            key = { companion.id }
            { ... companion}
            color = { getSubjectColor(companion.subject) }
          />
        ))}
      </section>

      <section className = "home-section">
          <CompanionsList 
            title = "Recently Completed Sessions"
            companions = { recentSessionsCompanions }
            classNames = "w-2/3 max-lg:w-full"
          />
          <CTA />
      </section>
    </main>
  )
}

export default Page