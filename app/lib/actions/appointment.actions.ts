'use server'
import { messaging } from './../../../lib/appwrite.config';

import { APPOINTMENT_COLLECTION_ID, DATABASE_ID, databases } from "@/lib/appwrite.config";
import { ID, Query } from "node-appwrite";
import { formatDateTime, parseStringify } from "../utils";
import { Appointment } from "@/types/appwrite.types";
import { revalidatePath } from "next/cache";

// CREATE APPOINTMENT
export const createAppointment = async (appointment: CreateAppointmentParams) => {
    try {
        const newAppointment = await databases.createDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            ID.unique(),
            appointment,
        );

        return parseStringify(newAppointment);
    } catch (error) {
        console.error("An error occurred while creating a new appointment:", error);
    }
};

export const getAppointment = async (appointmentId: string) => {
    try {
        const appointment = await databases.getDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointmentId,
        )

        return parseStringify(appointment);

    } catch (error) {
        console.log(error);

    }
}

export const getRecentAppointmentList = async () => {
    try {
        const appointments = await databases.listDocuments(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            [Query.orderDesc('$createdAt')]
        );

        const initialCounts = {
            scheduledCount: 0,
            pendingCount: 0,
            cancelledCount: 0,
        }

        const counts = (appointments.documents as Appointment[]).reduce((acc, appointment) => {
            if (appointment.status === 'scheduled') {
                acc.scheduledCount += 1;
            }
            if (appointment.status === 'pending') {
                acc.pendingCount += 1;
            }
            if (appointment.status === 'cancelled') {
                acc.cancelledCount += 1;
            }

            return acc;
        }, initialCounts);

        const data = {
            totalCount: appointments.total,
            ...counts,
            documents: appointments.documents
        }

        return parseStringify(data);

    } catch (error) {

    }
}

export const updateAppointment = async ({ appointmentId, userId, appointment, type }: UpdateAppointmentParams) => {
    try {
        const updatedAppointment = await databases.updateDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointmentId,
            appointment
        )

        if (!updatedAppointment) {
            throw new Error('Appointment not found');
        }

        //TODO SMS notification
        const smsMessage = `
        Hi, it's CarePulse. 
        ${type === 'schedule'
                ? `Your appointment has been scheduled for ${formatDateTime(appointment.schedule!).dateTime} with Dr. ${appointment.primaryPhysician}.`
                : `We regret to inform you that your appointment has been cancelled. Reason: ${appointment.cancellationReason}`
            }
        `
        await sendSMSNotification(userId, smsMessage);

        revalidatePath('/admin');

        // Pass the updated appointment data to parseStringify, not the function
        return parseStringify(updatedAppointment)
    } catch (error) {
        console.log(error)
    }
}

export const sendSMSNotification = async (userId: string, content: string) => {
    try {
        const message = await messaging.createSms(
            ID.unique(),
            content,
            [],
            [userId]
        )
        return parseStringify(message);
    } catch (error) {
        console.log(error);

    }
}