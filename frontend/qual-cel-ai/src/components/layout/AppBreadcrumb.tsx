import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type PathItem = {
  label: string;
  href?: string; // O link é opcional
};

type AppBreadcrumbProps = {
  items: PathItem[];
};

export function AppBreadcrumb({ items }: Readonly<AppBreadcrumbProps>) {
  return (
    <div className="mb-10 ml-5">
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => (
            <React.Fragment key={item.label}>
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <span className="font-semibold text-foreground">
                    {item.label}
                  </span>
                )}
              </BreadcrumbItem>

              {index < items.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
