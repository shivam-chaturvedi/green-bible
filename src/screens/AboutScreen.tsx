import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {BottomNavigation} from '../components/BottomNavigation';
import {AppTab} from '../types';
import {colors} from '../theme/colors';

type Props = {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
};

const missionCopy =
  'Our mission is to empower gardeners by providing innovative tools and knowledge, enabling them to create and nurture thriving gardens. By promoting a love for gardening and fostering sustainable practices, we aim to help communities cultivate their own beautiful, eco-friendly oasis.';

const developerCopy =
  'I am a passionate individual who loves gardening, technology, and nature. My goal is to create a gardening app that supports users in cultivating their dream gardens and fosters a sense of community. In my spare time, I enjoy staying active through swimming and basketball. I believe that my interests help me build tools that empower gardeners worldwide.';

const sustainabilityCopy =
  'From composting reminders to plant health AI, every feature promotes eco-friendly gardening that respects the planet.';

const featureList = [
  'Smart Planting Calendar',
  'AI Plant Identification',
  'Disease Diagnosis',
  'Sustainability Guides',
  'Location-Based Tips',
];

const faqItems = [
  {
    icon: '✉️',
    title: 'How do I contact support?',
    answer: 'You can email me directly at agasthya.shukla@gmail.com.',
  },
  {
    icon: '🍃',
    title: 'How can I improve my garden?',
    answer:
      'Use the Sustainability screen for water-saving strategies, composting tips, and eco-friendly practices tailored to your needs.',
  },
  {
    icon: '🐛',
    title: 'Can the app help with plant diseases?',
    answer:
      'Yes! The Plant Health section offers quick diagnosis tips and shows you treatment suggestions based on symptoms.',
  },
];

export function AboutScreen({activeTab, onNavigate}: Props) {
  const openMail = () => {
    Linking.openURL('mailto:agasthya.shukla@gmail.com').catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>🍃</Text>
          <Text style={styles.headerTitle}>Garden App</Text>
          <Text style={styles.headerSubtitle}>Cultivating Digital Gardens</Text>
        </View>

        <InfoCard icon="🌱" title="Our Mission" body={missionCopy} />
        <InfoCard icon="👩‍💻" title="About the Developer" body={developerCopy} />
        <InfoCard icon="🌍" title="Sustainability Promise" body={sustainabilityCopy} />

        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <Text style={styles.featureIcon}>⭐</Text>
            <Text style={styles.featureTitle}>Core Features</Text>
          </View>
          {featureList.map(item => (
            <Text key={item} style={styles.featureItem}>
              • {item}
            </Text>
          ))}
        </View>

        <View style={styles.faqContainer}>
          <Text style={styles.faqHeading}>Frequently Asked Questions</Text>
          {faqItems.map(item => (
            <View key={item.title} style={styles.faqCard}>
              <Text style={styles.faqIcon}>{item.icon}</Text>
              <View style={styles.faqContent}>
                <Text style={styles.faqTitle}>{item.title}</Text>
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactIcon}>💬</Text>
            <Text style={styles.contactTitle}>Get in Touch</Text>
          </View>
          <TouchableOpacity style={styles.contactButtonFull} onPress={openMail}>
            <Text style={styles.contactButtonText}>✉️  Email Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for gardeners everywhere</Text>
          <Text style={styles.footerText}>Version 1.1.0</Text>
        </View>
      </ScrollView>

      <BottomNavigation activeTab={activeTab} onSelect={onNavigate} />
    </View>
  );
}

function InfoCard({icon, title, body}: {icon: string; title: string; body: string}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionIconBubble}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <View style={styles.sectionContent}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.greenLight,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    elevation: 2,
  },
  headerIcon: {
    fontSize: 48,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.greenPrimary,
    marginTop: 8,
  },
  headerSubtitle: {
    color: colors.textGray,
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    elevation: 1,
  },
  sectionIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  sectionBody: {
    color: colors.textDark,
    marginTop: 6,
    lineHeight: 20,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    elevation: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  featureItem: {
    color: colors.textDark,
    marginTop: 6,
  },
  faqContainer: {
    marginTop: 8,
  },
  faqHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.greenPrimary,
    marginBottom: 8,
  },
  faqCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 4,
    elevation: 1,
  },
  faqIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  faqContent: {
    flex: 1,
  },
  faqTitle: {
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  faqAnswer: {
    marginTop: 4,
    color: colors.textDark,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 6,
    elevation: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.greenPrimary,
  },
  contactButton: {
    flex: 1,
    backgroundColor: colors.greenPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  contactButtonFull: {
    backgroundColor: colors.greenPrimary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  footerText: {
    color: colors.textGray,
  },
});
