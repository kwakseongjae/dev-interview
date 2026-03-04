"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormattedText } from "@/components/feedback/FormattedText";
import { FAQ_DATA } from "@/data/faq";

export function FaqAccordion() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Accordion type="single" collapsible className="w-full">
        {FAQ_DATA.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-sm font-medium hover:text-gold">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              <FormattedText
                text={faq.answer}
                highlightClassName="font-semibold text-amber-700 dark:text-gold bg-gold/15 dark:bg-gold/20 px-1 rounded"
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
